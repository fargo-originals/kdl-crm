import { auth } from "@clerk/nextjs/server";
import { supabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function DELETE(_req: Request, { params }: { params: Promise<{ type: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type } = await params;
  const { data: dbUser } = await supabaseServer.from("users").select("id").eq("clerk_id", userId).maybeSingle();
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await supabaseServer.from("integrations").update({ is_active: false }).eq("user_id", dbUser.id).eq("type", type);
  return NextResponse.json({ ok: true });
}
