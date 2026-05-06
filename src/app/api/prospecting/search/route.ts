import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getCurrentDbUserId } from "@/lib/prospecting/auth";
import { getSector } from "@/lib/prospecting/sectors";
import { launchGoogleMapsScraper } from "@/lib/prospecting/apify-client";

export async function POST(req: Request) {
  const { dbUserId, error: authError } = await getCurrentDbUserId();
  if (authError === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!dbUserId) return NextResponse.json({ error: authError ?? "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { sector?: string; zone?: string; zoneType?: string };
  if (!body.sector || !body.zone) {
    return NextResponse.json({ error: "sector and zone are required" }, { status: 400 });
  }

  const sector = getSector(body.sector);
  if (!sector) return NextResponse.json({ error: "Invalid sector" }, { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const webhookSecret = process.env.APIFY_WEBHOOK_SECRET;
  if (!appUrl || !webhookSecret) {
    return NextResponse.json({ error: "Missing NEXT_PUBLIC_APP_URL or APIFY_WEBHOOK_SECRET" }, { status: 500 });
  }
  console.log(`[prospecting/search] webhook url: ${appUrl.replace(/\/$/, "")}/api/prospecting/webhook`);

  const keywords = `${sector.keywords[0]} en ${body.zone} Madrid`;

  const { data: search, error: createError } = await supabaseServer
    .from("prospect_searches")
    .insert({
      user_id: dbUserId,
      sector: sector.id,
      zone: body.zone,
      zone_type: body.zoneType ?? "barrio",
      keywords,
      status: "searching",
    })
    .select()
    .single();

  if (createError) return NextResponse.json({ error: createError.message }, { status: 500 });

  try {
    const { runId } = await launchGoogleMapsScraper(
      keywords,
      60,
      `${appUrl.replace(/\/$/, "")}/api/prospecting/webhook`,
      webhookSecret
    );

    await supabaseServer
      .from("prospect_searches")
      .update({ apify_run_id: runId, updated_at: new Date().toISOString() })
      .eq("id", search.id);

    return NextResponse.json({
      data: {
        searchId: search.id,
        status: "searching",
        redirectTo: `/prospecting/${search.id}`,
      },
    });
  } catch (error) {
    await supabaseServer
      .from("prospect_searches")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", search.id);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
