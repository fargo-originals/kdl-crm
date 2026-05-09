import { getSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

function canManagePipeline(role: string) {
  return role === "owner" || role === "admin";
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePipeline(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { error } = await supabaseServer
    .from("pipeline_stages")
    .delete()
    .eq("id", id)
    .eq("is_won", false)
    .eq("is_lost", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
