import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getCurrentDbUserId } from "@/lib/prospecting/auth";
import { launchEnrichmentRun } from "@/lib/prospecting/apify-client";

export async function POST(req: Request) {
  const { dbUserId, error: authError } = await getCurrentDbUserId();
  if (authError === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!dbUserId) return NextResponse.json({ error: authError ?? "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { searchId?: string };
  if (!body.searchId) return NextResponse.json({ error: "searchId is required" }, { status: 400 });

  const { data: search, error: searchError } = await supabaseServer
    .from("prospect_searches")
    .select("id")
    .eq("id", body.searchId)
    .eq("user_id", dbUserId)
    .maybeSingle();

  if (searchError) return NextResponse.json({ error: searchError.message }, { status: 500 });
  if (!search) return NextResponse.json({ error: "Search not found" }, { status: 404 });

  const { data: results, error: resultsError } = await supabaseServer
    .from("prospect_results")
    .select("id, website")
    .eq("search_id", body.searchId)
    .not("website", "is", null);

  if (resultsError) return NextResponse.json({ error: resultsError.message }, { status: 500 });

  const urls = [...new Set((results ?? []).map((result) => result.website).filter((url): url is string => Boolean(url)))];

  if (urls.length === 0) {
    await supabaseServer
      .from("prospect_searches")
      .update({ status: "done", updated_at: new Date().toISOString() })
      .eq("id", body.searchId);
    return NextResponse.json({ data: { runId: null, enrichedTargets: 0 } });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const webhookSecret = process.env.APIFY_WEBHOOK_SECRET;
  if (!appUrl || !webhookSecret) {
    return NextResponse.json({ error: "Missing NEXT_PUBLIC_APP_URL or APIFY_WEBHOOK_SECRET" }, { status: 500 });
  }

  const { runId } = await launchEnrichmentRun(
    urls,
    `${appUrl.replace(/\/$/, "")}/api/prospecting/webhook`,
    webhookSecret
  );

  await supabaseServer
    .from("prospect_searches")
    .update({ status: "enriching", apify_run_id: runId, updated_at: new Date().toISOString() })
    .eq("id", body.searchId);

  await supabaseServer
    .from("prospect_results")
    .update({ enrichment_status: "enriching", updated_at: new Date().toISOString() })
    .eq("search_id", body.searchId)
    .not("website", "is", null);

  return NextResponse.json({ data: { runId, enrichedTargets: urls.length } });
}
