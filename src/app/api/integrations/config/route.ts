import { getSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// Returns { clientId, clientSecret } from DB config row or env vars
export async function getProviderConfig(provider: string): Promise<{ clientId: string; clientSecret: string } | null> {
  const { data } = await supabaseServer
    .from("integrations")
    .select("access_token, refresh_token")
    .eq("type", `config_${provider}`)
    .eq("is_active", true)
    .maybeSingle();

  if (data?.access_token && data?.refresh_token) {
    return { clientId: data.access_token, clientSecret: data.refresh_token };
  }

  if (provider === "google" && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    return { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET };
  }
  if (provider === "microsoft" && process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
    return { clientId: process.env.MICROSOFT_CLIENT_ID, clientSecret: process.env.MICROSOFT_CLIENT_SECRET };
  }
  if (provider === "slack" && process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET) {
    return { clientId: process.env.SLACK_CLIENT_ID, clientSecret: process.env.SLACK_CLIENT_SECRET };
  }

  return null;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [google, microsoft, slack] = await Promise.all([
    getProviderConfig("google"),
    getProviderConfig("microsoft"),
    getProviderConfig("slack"),
  ]);

  return NextResponse.json({ google: !!google, microsoft: !!microsoft, slack: !!slack });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { provider, clientId, clientSecret } = await req.json() as {
    provider: string;
    clientId: string;
    clientSecret: string;
  };

  if (!["google", "microsoft", "slack"].includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }
  if (!clientId?.trim() || !clientSecret?.trim()) {
    return NextResponse.json({ error: "Client ID y Client Secret son obligatorios" }, { status: 400 });
  }

  await supabaseServer.from("integrations").upsert(
    {
      user_id: session.sub,
      type: `config_${provider}`,
      access_token: clientId.trim(),
      refresh_token: clientSecret.trim(),
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,type" }
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider");

  if (!provider || !["google", "microsoft", "slack"].includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  await supabaseServer
    .from("integrations")
    .update({ is_active: false })
    .eq("user_id", session.sub)
    .eq("type", `config_${provider}`);

  return NextResponse.json({ ok: true });
}
