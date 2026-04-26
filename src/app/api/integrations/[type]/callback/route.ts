import { supabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // clerk userId
  const error = searchParams.get("error");

  if (error || !code || !state) {
    redirect("/settings/integrations?error=oauth_failed");
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    let tokenData: { access_token: string; refresh_token?: string; expires_in?: number } | null = null;

    if (type.startsWith("google_")) {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: code!,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: `${appUrl}/api/integrations/${type}/callback`,
          grant_type: "authorization_code",
        }),
      });
      tokenData = await res.json();
    } else if (type.startsWith("microsoft_")) {
      const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: code!,
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          redirect_uri: `${appUrl}/api/integrations/${type}/callback`,
          grant_type: "authorization_code",
        }),
      });
      tokenData = await res.json();
    } else if (type === "slack") {
      const res = await fetch("https://slack.com/api/oauth.v2.access", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: code!,
          client_id: process.env.SLACK_CLIENT_ID!,
          client_secret: process.env.SLACK_CLIENT_SECRET!,
          redirect_uri: `${appUrl}/api/integrations/slack/callback`,
        }),
      });
      const slackData = await res.json();
      tokenData = { access_token: slackData.access_token };
    }

    if (!tokenData?.access_token) {
      redirect("/settings/integrations?error=token_failed");
    }

    const { data: dbUser } = await supabaseServer.from("users").select("id").eq("clerk_id", state).maybeSingle();
    if (!dbUser) redirect("/settings/integrations?error=user_not_found");

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    await supabaseServer.from("integrations").upsert({
      user_id: dbUser!.id,
      type,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      expires_at: expiresAt,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,type" });

  } catch (err) {
    console.error("OAuth callback error:", err);
    redirect("/settings/integrations?error=callback_error");
  }

  redirect("/settings/integrations?success=connected");
}
