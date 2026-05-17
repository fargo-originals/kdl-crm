import { getSession } from "@/lib/auth/session";
import { CreateTaskSchema } from "@/lib/crm/schemas";
import { supabaseServer } from "@/lib/supabase-server";
import { validateJsonBody } from "@/lib/validation";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dealId = searchParams.get("deal_id");
  const contactId = searchParams.get("contact_id");
  const companyId = searchParams.get("company_id");
  const overdue = searchParams.get("overdue") === "1";

  let query = supabaseServer
    .from("tasks")
    .select("*, assignee:users!tasks_assignee_id_fkey(first_name, last_name)")
    .order("due_date", { ascending: true });

  if (session.role !== "owner" && session.role !== "admin") {
    query = query.or(`assignee_id.eq.${session.sub},created_by_id.eq.${session.sub}`);
  }

  if (dealId) query = query.eq("deal_id", dealId);
  if (contactId) query = query.eq("contact_id", contactId);
  if (companyId) query = query.eq("company_id", companyId);
  if (overdue) {
    query = query
      .lt("due_date", new Date().toISOString())
      .not("status", "in", '("done","completed","cancelled")');
  }

  const { data, error } = await query;

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
