import { supabaseServer } from "@/lib/supabase-server";
import { getRunDataset, type ApifyRecord } from "@/lib/prospecting/apify-client";
import { parseEnrichedData } from "@/lib/prospecting/enrichment-parser";

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
    records.find((record) => {
      const recordHost = normalizeHost(record.loadedUrl ?? record.url);
      return recordHost === targetHost || recordHost?.endsWith(`.${targetHost}`);
    }) ?? null
  );
}

export async function markApifyRunFailed(runId: string) {
  const { data: search, error } = await supabaseServer
    .from("prospect_searches")
    .select("id")
    .eq("apify_run_id", runId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!search) throw new Error("Search not found");

  await supabaseServer.from("prospect_results").update({ enrichment_status: "failed" }).eq("search_id", search.id);
  await supabaseServer
    .from("prospect_searches")
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("id", search.id);

  return { searchId: search.id, status: "failed" };
}

export async function processApifyRun(runId: string) {
  const { data: search, error: searchError } = await supabaseServer
    .from("prospect_searches")
    .select("id")
    .eq("apify_run_id", runId)
    .maybeSingle();

  if (searchError) throw new Error(searchError.message);
  if (!search) throw new Error("Search not found");

  const records = await getRunDataset(runId);
  const { data: results, error: resultsError } = await supabaseServer
    .from("prospect_results")
    .select("id, website")
    .eq("search_id", search.id);

  if (resultsError) throw new Error(resultsError.message);

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
    const hasEnrichment = Boolean(parsed.email || parsed.instagram || parsed.contactName);
    if (hasEnrichment) enrichedCount += 1;

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
