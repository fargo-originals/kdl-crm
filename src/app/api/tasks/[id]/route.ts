import { getSession } from "@/lib/auth/session";
import { UpdateTaskSchema } from "@/lib/crm/schemas";
import { supabaseServer } from "@/lib/supabase-server";
import { validateJsonBody } from "@/lib/validation";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const validated = await validateJsonBody(req, UpdateTaskSchema);
  if ('response' in validated) return validated.response;

  const updatePayload = {
    ...validated.data,
    updated_at: new Date().toISOString(),
  };

  let query = supabaseServer
    .from("tasks")
    .update(updatePayload)
    .eq("id", id);

  if (session.role !== "owner" && session.role !== "admin") {
    query = query.or(`assignee_id.eq.${session.sub},created_by_id.eq.${session.sub}`);
  }

  const { data, error } = await query.select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let query = supabaseServer.from("tasks").delete().eq("id", id);

  if (session.role !== "owner" && session.role !== "admin") {
    query = query.or(`assignee_id.eq.${session.sub},created_by_id.eq.${session.sub}`);
  }

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
