import { getSession } from "@/lib/auth/session";
import { getProviderConfig } from "@/app/api/integrations/config/route";
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
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { type } = await params;
  const oauthConfig = OAUTH_CONFIGS[type];
  if (!oauthConfig) return new Response("Integration not found", { status: 404 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (type.startsWith("google_")) {
    const creds = await getProviderConfig("google");
    if (!creds) redirect("/settings/integrations?error=missing_google_config");
    const qs = new URLSearchParams({
      client_id: creds!.clientId,
      redirect_uri: `${appUrl}/api/integrations/${type}/callback`,
      response_type: "code",
      scope: oauthConfig.scope,
      access_type: "offline",
      prompt: "consent",
      state: session.sub,
    });
    redirect(`${oauthConfig.url}?${qs.toString()}`);
  }

  if (type.startsWith("microsoft_")) {
    const creds = await getProviderConfig("microsoft");
    if (!creds) redirect("/settings/integrations?error=missing_microsoft_config");
    const qs = new URLSearchParams({
      client_id: creds!.clientId,
      redirect_uri: `${appUrl}/api/integrations/${type}/callback`,
      response_type: "code",
      scope: oauthConfig.scope,
      state: session.sub,
    });
    redirect(`${oauthConfig.url}?${qs.toString()}`);
  }

  if (type === "slack") {
    const creds = await getProviderConfig("slack");
    if (!creds) redirect("/settings/integrations?error=missing_slack_config");
    const qs = new URLSearchParams({
      client_id: creds!.clientId,
      redirect_uri: `${appUrl}/api/integrations/slack/callback`,
      scope: oauthConfig.scope,
      state: session.sub,
    });
    redirect(`${oauthConfig.url}?${qs.toString()}`);
  }

  return new Response("Not implemented", { status: 501 });
}
