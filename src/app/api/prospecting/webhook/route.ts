import { NextResponse } from "next/server";
import { markApifyRunFailed, processApifyRun, processGoogleMapsRun } from "@/lib/prospecting/process-apify-run";
import { supabaseServer } from "@/lib/supabase-server";

type ApifyWebhookPayload = {
  eventType?: string;
  resource?: { id?: string; defaultDatasetId?: string };
  eventData?: { actorRunId?: string };
};

export async function POST(req: Request) {
  const expectedSecret = process.env.APIFY_WEBHOOK_SECRET;
  const receivedSecret = req.headers.get("x-apify-webhook-secret");

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as ApifyWebhookPayload;
  const runId = body.resource?.id ?? body.eventData?.actorRunId;
  if (!runId) return NextResponse.json({ error: "Missing Apify run id" }, { status: 400 });

  if (body.eventType === "ACTOR.RUN.FAILED") {
    const data = await markApifyRunFailed(runId);
    return NextResponse.json({ data });
  }

  // Detect whether this is a Google Maps Scraper run or a WCC enrichment run
  const { data: gmsSearch } = await supabaseServer
    .from("prospect_searches")
    .select("id")
    .eq("apify_run_id", runId)
    .maybeSingle();

  if (gmsSearch) {
    const data = await processGoogleMapsRun(runId);
    return NextResponse.json({ data });
  }

  // WCC enrichment run
  const data = await processApifyRun(runId);
  return NextResponse.json({ data });
}
