import { getSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let query = supabaseServer
    .from("tickets")
    .select("*, reporter:users!tickets_reporter_id_fkey(first_name, last_name), company:companies(name)")
    .order("created_at", { ascending: false });

  if (session.role !== "owner" && session.role !== "admin") {
    query = query.or(`assignee_id.eq.${session.sub},reporter_id.eq.${session.sub}`);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const { data, error } = await supabaseServer
    .from("tickets")
    .insert({ ...body, reporter_id: session.sub })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
