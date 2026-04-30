import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getCurrentDbUserId } from "@/lib/prospecting/auth";
import { getSector } from "@/lib/prospecting/sectors";
import { searchPlaces } from "@/lib/prospecting/google-places";
import { launchEnrichmentRun } from "@/lib/prospecting/apify-client";

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
    const places = await searchPlaces(keywords, 60);

    if (places.length > 0) {
      const { error: insertError } = await supabaseServer.from("prospect_results").insert(
        places.map((place) => ({
          search_id: search.id,
          google_place_id: place.googlePlaceId,
          name: place.name,
          address: place.address,
          phone: place.phone,
          website: place.website,
          google_rating: place.rating,
          google_review_count: place.reviewCount,
          category: place.category,
        }))
      );

      if (insertError) throw new Error(insertError.message);
    }

    const websites = [...new Set(places.map((place) => place.website).filter((url): url is string => Boolean(url)))];
    const status = websites.length > 0 ? "enriching" : "done";
    let apifyRunId: string | null = null;

    if (websites.length > 0) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      const webhookSecret = process.env.APIFY_WEBHOOK_SECRET;
      if (!appUrl || !webhookSecret) throw new Error("Missing NEXT_PUBLIC_APP_URL or APIFY_WEBHOOK_SECRET");

      const { runId } = await launchEnrichmentRun(
        websites,
        `${appUrl.replace(/\/$/, "")}/api/prospecting/webhook`,
        webhookSecret
      );
      apifyRunId = runId;

      await supabaseServer
        .from("prospect_results")
        .update({ enrichment_status: "enriching", updated_at: new Date().toISOString() })
        .eq("search_id", search.id)
        .not("website", "is", null);
    }

    await supabaseServer
      .from("prospect_searches")
      .update({
        status,
        total_results: places.length,
        apify_run_id: apifyRunId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", search.id);

    return NextResponse.json({
      data: {
        searchId: search.id,
        totalResults: places.length,
        status,
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
