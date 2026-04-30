export type ApifyRecord = {
  url?: string;
  loadedUrl?: string;
  text?: string;
  markdown?: string;
  html?: string;
  pageTitle?: string;
  [key: string]: unknown;
};

type RunResponse = {
  data?: {
    id?: string;
    defaultDatasetId?: string;
  };
};

type RunDetailResponse = {
  data?: {
    defaultDatasetId?: string;
  };
};

function getApifyToken() {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("Missing APIFY_API_TOKEN");
  return token;
}

export async function launchEnrichmentRun(
  urls: string[],
  webhookUrl: string,
  webhookSecret: string
): Promise<{ runId: string }> {
  const token = getApifyToken();
  const maxCrawlPages = Math.max(urls.length, 1);

  const response = await fetch("https://api.apify.com/v2/acts/apify~website-content-crawler/runs", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startUrls: urls.map((url) => ({ url })),
      maxCrawlPages,
      maxCrawlDepth: 0,
      crawlerType: "cheerio",
      proxyConfiguration: { useApifyProxy: true },
      webhooks: [
        {
          eventTypes: ["ACTOR.RUN.SUCCEEDED", "ACTOR.RUN.FAILED"],
          requestUrl: webhookUrl,
          headersTemplate: JSON.stringify({
            "x-apify-webhook-secret": webhookSecret,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Apify launch error: ${response.status} ${message}`);
  }

  const data = (await response.json()) as RunResponse;
  const runId = data.data?.id;
  if (!runId) throw new Error("Apify did not return a run id");
  return { runId };
}

async function getRunDatasetId(runId: string) {
  const token = getApifyToken();
  const response = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Apify run lookup error: ${response.status} ${message}`);
  }

  const data = (await response.json()) as RunDetailResponse;
  return data.data?.defaultDatasetId ?? null;
}

export async function getRunDataset(runId: string): Promise<ApifyRecord[]> {
  const token = getApifyToken();
  const datasetId = await getRunDatasetId(runId);
  if (!datasetId) return [];

  const response = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?clean=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Apify dataset error: ${response.status} ${message}`);
  }

  return (await response.json()) as ApifyRecord[];
}
