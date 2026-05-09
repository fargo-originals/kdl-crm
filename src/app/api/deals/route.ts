import { getSession } from "@/lib/auth/session";
import { CreateDealSchema } from "@/lib/crm/schemas";
import { supabaseServer } from "@/lib/supabase-server";
import { validateJsonBody } from "@/lib/validation";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let query = supabaseServer
    .from("deals")
    .select("*, company:companies(name), owner:users(first_name, last_name)")
    .order("created_at", { ascending: false });

  if (session.role !== "owner" && session.role !== "admin") {
    query = query.eq("owner_id", session.sub);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const validated = await validateJsonBody(req, CreateDealSchema);
  if ('response' in validated) return validated.response;

  const { data, error } = await supabaseServer
    .from("deals")
    .insert({ ...validated.data, owner_id: session.sub })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
