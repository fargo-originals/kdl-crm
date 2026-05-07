import { supabaseServer } from "@/lib/supabase-server";
import {
  getRunDataset,
  getGoogleMapsDataset,
  launchEnrichmentRun,
  type ApifyRecord,
  type GoogleMapsRecord,
} from "@/lib/prospecting/apify-client";
import { parseEnrichedData } from "@/lib/prospecting/enrichment-parser";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getRecordContent(record: ApifyRecord) {
  return [record.markdown, record.text, record.html, record.pageTitle].filter(Boolean).join("\n");
}

function normalizeHost(url: string | null | undefined) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function findRecordForWebsite(records: ApifyRecord[], website: string | null) {
  const targetHost = normalizeHost(website);
  if (!targetHost) return null;
  return (
    records.find((r) => {
      const host = normalizeHost(r.loadedUrl ?? r.url);
      return host === targetHost || host?.endsWith(`.${targetHost}`);
    }) ?? null
  );
}

// ── Mark failed ───────────────────────────────────────────────────────────────

export async function markApifyRunFailed(runId: string) {
  const { data: search, error } = await supabaseServer
    .from("prospect_searches")
    .select("id")
    .eq("apify_run_id", runId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!search) throw new Error("Search not found");

  await supabaseServer
    .from("prospect_results")
    .update({ enrichment_status: "failed" })
    .eq("search_id", search.id);

  await supabaseServer
    .from("prospect_searches")
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("id", search.id);

  return { searchId: search.id, status: "failed" };
}

// ── Process Google Maps Scraper run ───────────────────────────────────────────
// Creates prospect_results from GMS structured output, then optionally launches
// Website Content Crawler to enrich emails from business websites.

export async function processGoogleMapsRun(runId: string) {
  const { data: search, error: searchError } = await supabaseServer
    .from("prospect_searches")
    .select("id")
    .eq("apify_run_id", runId)
    .maybeSingle();

  if (searchError) throw new Error(searchError.message);
  if (!search) throw new Error("Search not found");

  const records = await getGoogleMapsDataset(runId);
  console.log(`[processGoogleMapsRun] runId=${runId} apify_records=${records.length}`);

  const rows = records
    .filter((r): r is GoogleMapsRecord & { title: string } => Boolean(r.title) && !r.permanentlyClosed)
    .map((r) => ({
      search_id: search.id,
      google_place_id: r.placeId ?? `gms_${Math.random().toString(36).slice(2)}`,
      name: r.title,
      address: r.address ?? null,
      neighborhood: r.neighborhood ?? null,
      district: r.district ?? null,
      phone: r.phone ?? null,
      website: r.website ?? null,
      logo_url: r.imageUrl ?? (Array.isArray(r.imageUrls) ? r.imageUrls[0] : null) ?? null,
      google_rating: r.totalScore ?? null,
      google_review_count: r.reviewsCount ?? null,
      category: r.categoryName ?? null,
      enrichment_status: r.website ? "pending" : "done",
    }));

  if (rows.length > 0) {
    await supabaseServer.from("prospect_results").insert(rows);
  }

  // Launch WCC enrichment for businesses with websites
  const websites = [...new Set(rows.map((r) => r.website).filter((w): w is string => Boolean(w)))];
  let enrichRunId: string | null = null;

  if (websites.length > 0) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const webhookSecret = process.env.APIFY_WEBHOOK_SECRET;
    if (appUrl && webhookSecret) {
      try {
        const { runId: enrichId } = await launchEnrichmentRun(
          websites,
          `${appUrl.replace(/\/$/, "")}/api/prospecting/webhook`,
          webhookSecret
        );
        enrichRunId = enrichId;
        // Store enrichment run id so the second webhook knows which search to update
        await supabaseServer
          .from("prospect_searches")
          .update({ apify_enrich_run_id: enrichRunId, status: "enriching", total_results: rows.length, updated_at: new Date().toISOString() })
          .eq("id", search.id);
      } catch {
        // Enrichment is optional — if it fails, results are still usable
      }
    }
  }

  if (!enrichRunId) {
    await supabaseServer
      .from("prospect_searches")
      .update({ status: "done", total_results: rows.length, updated_at: new Date().toISOString() })
      .eq("id", search.id);
  }

  return { searchId: search.id, totalResults: rows.length, enrichRunId };
}

// ── Process Website Content Crawler run (enrichment) ─────────────────────────

export async function processApifyRun(runId: string) {
  // Support both apify_run_id (GMS) and apify_enrich_run_id (WCC)
  let search: { id: string } | null = null;

  const { data: byEnrich } = await supabaseServer
    .from("prospect_searches")
    .select("id")
    .eq("apify_enrich_run_id", runId)
    .maybeSingle();
  search = byEnrich;

  if (!search) {
    const { data: byRun, error } = await supabaseServer
      .from("prospect_searches")
      .select("id")
      .eq("apify_run_id", runId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    search = byRun;
  }

  if (!search) throw new Error("Search not found");

  const records = await getRunDataset(runId);
  const { data: results, error: resultsError } = await supabaseServer
    .from("prospect_results")
    .select("id, website")
    .eq("search_id", search.id);

  if (resultsError) throw new Error(resultsError.message);

  const noWebsiteIds = (results ?? []).filter((r) => !r.website).map((r) => r.id);
  if (noWebsiteIds.length > 0) {
    await supabaseServer
      .from("prospect_results")
      .update({ enrichment_status: "done", updated_at: new Date().toISOString() })
      .in("id", noWebsiteIds);
  }

  let enrichedCount = 0;
  for (const result of results ?? []) {
    if (!result.website) continue;

    const record = findRecordForWebsite(records, result.website);
    if (!record) {
      await supabaseServer
        .from("prospect_results")
        .update({ enrichment_status: "failed", updated_at: new Date().toISOString() })
        .eq("id", result.id);
      continue;
    }

    const parsed = parseEnrichedData(getRecordContent(record), record.loadedUrl ?? record.url ?? result.website);
    if (parsed.email || parsed.instagram || parsed.contactName) enrichedCount += 1;

    await supabaseServer
      .from("prospect_results")
      .update({
        email: parsed.email,
        instagram: parsed.instagram,
        contact_name: parsed.contactName,
        contact_title: parsed.contactTitle,
        enrichment_status: "done",
        enrichment_data: record,
        updated_at: new Date().toISOString(),
      })
      .eq("id", result.id);
  }

  await supabaseServer
    .from("prospect_searches")
    .update({ status: "done", enriched_count: enrichedCount, updated_at: new Date().toISOString() })
    .eq("id", search.id);

  return { searchId: search.id, enrichedCount, recordCount: records.length };
}
