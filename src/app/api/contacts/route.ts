import { getSession } from "@/lib/auth/session";
import { CreateContactSchema } from "@/lib/crm/schemas";
import { supabaseServer } from "@/lib/supabase-server";
import { validateJsonBody } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const emailFilter = searchParams.get("email");
  const limit = Number(searchParams.get("limit") ?? 200);

  let query = supabaseServer
    .from("contacts")
    .select("*, company:companies(name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (session.role !== "owner" && session.role !== "admin") {
    query = query.eq("owner_id", session.sub);
  }
  if (emailFilter) {
    query = query.ilike("email", emailFilter);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const validated = await validateJsonBody(req, CreateContactSchema);
  if ('response' in validated) return validated.response;

  const { data, error } = await supabaseServer
    .from("contacts")
    .insert({ ...validated.data, owner_id: session.sub })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
