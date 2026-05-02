import { getSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function DELETE(_req: Request, { params }: { params: Promise<{ type: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type } = await params;
  await supabaseServer.from("integrations").update({ is_active: false }).eq("user_id", session.sub).eq("type", type);
  return NextResponse.json({ ok: true });
}
