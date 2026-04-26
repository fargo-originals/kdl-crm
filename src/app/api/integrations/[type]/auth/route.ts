import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

const OAUTH_CONFIGS: Record<string, { url: string; scope: string }> = {
  google_gmail: {
    url: "https://accounts.google.com/o/oauth2/v2/auth",
    scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send",
  },
  google_calendar: {
    url: "https://accounts.google.com/o/oauth2/v2/auth",
    scope: "https://www.googleapis.com/auth/calendar",
  },
  microsoft_outlook: {
    url: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    scope: "https://graph.microsoft.com/Mail.ReadWrite offline_access",
  },
  microsoft_teams: {
    url: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    scope: "https://graph.microsoft.com/OnlineMeetings.ReadWrite offline_access",
  },
  slack: {
    url: "https://slack.com/oauth/v2/authorize",
    scope: "channels:read,chat:write,incoming-webhook",
  },
};

export async function GET(_req: Request, { params }: { params: Promise<{ type: string }> }) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { type } = await params;
  const config = OAUTH_CONFIGS[type];

  if (!config) return new Response("Integration not found", { status: 404 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // For Google-based integrations
  if (type.startsWith("google_")) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      redirect(`/settings/integrations?error=missing_google_config`);
    }
    const params = new URLSearchParams({
      client_id: clientId!,
      redirect_uri: `${appUrl}/api/integrations/${type}/callback`,
      response_type: "code",
      scope: config.scope,
      access_type: "offline",
      prompt: "consent",
      state: userId,
    });
    redirect(`${config.url}?${params.toString()}`);
  }

  // For Microsoft
  if (type.startsWith("microsoft_")) {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    if (!clientId) {
      redirect(`/settings/integrations?error=missing_microsoft_config`);
    }
    const params = new URLSearchParams({
      client_id: clientId!,
      redirect_uri: `${appUrl}/api/integrations/${type}/callback`,
      response_type: "code",
      scope: config.scope,
      state: userId,
    });
    redirect(`${config.url}?${params.toString()}`);
  }

  // For Slack
  if (type === "slack") {
    const clientId = process.env.SLACK_CLIENT_ID;
    if (!clientId) {
      redirect(`/settings/integrations?error=missing_slack_config`);
    }
    const params = new URLSearchParams({
      client_id: clientId!,
      redirect_uri: `${appUrl}/api/integrations/slack/callback`,
      scope: config.scope,
      state: userId,
    });
    redirect(`${config.url}?${params.toString()}`);
  }

  return new Response("Not implemented", { status: 501 });
}
