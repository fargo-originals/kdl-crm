import { getSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  let query = supabaseServer
    .from("tasks")
    .update(body)
    .eq("id", id);

  if (session.role !== "owner" && session.role !== "admin") {
    query = query.or(`assignee_id.eq.${session.sub},created_by_id.eq.${session.sub}`);
  }

  const { data, error } = await query.select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
