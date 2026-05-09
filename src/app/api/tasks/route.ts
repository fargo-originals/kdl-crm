import { getSession } from "@/lib/auth/session";
import { CreateTaskSchema } from "@/lib/crm/schemas";
import { supabaseServer } from "@/lib/supabase-server";
import { validateJsonBody } from "@/lib/validation";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseServer
    .from("tasks")
    .select("*, assignee:users!tasks_assignee_id_fkey(first_name, last_name)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const validated = await validateJsonBody(req, CreateTaskSchema);
  if ('response' in validated) return validated.response;

  const { assignee_id, ...task } = validated.data;
  const { data, error } = await supabaseServer
    .from("tasks")
    .insert({ ...task, created_by_id: session.sub, assignee_id: assignee_id ?? session.sub })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
