import { NextResponse } from "next/server";
import { markApifyRunFailed, processApifyRun } from "@/lib/prospecting/process-apify-run";

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

  const data = await processApifyRun(runId);
  return NextResponse.json({ data });
}
