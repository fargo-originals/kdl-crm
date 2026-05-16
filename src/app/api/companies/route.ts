import { getSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const industry = searchParams.get("industry");
  const neighborhood = searchParams.get("neighborhood");
  const search = searchParams.get("search");
  const hasEmail = searchParams.get("hasEmail") === "true";
  const email = searchParams.get("email");
  const limit = searchParams.get("limit");

  // Si filtra por barrio, obtener los company IDs vía prospect_results
  let neighborhoodCompanyIds: string[] | null = null;
  if (neighborhood) {
    const { data: pr } = await supabaseServer
      .from("prospect_results")
      .select("imported_company_id")
      .eq("neighborhood", neighborhood)
      .not("imported_company_id", "is", null);

    neighborhoodCompanyIds = (pr ?? [])
      .map(r => r.imported_company_id)
      .filter(Boolean) as string[];

    if (neighborhoodCompanyIds.length === 0) return NextResponse.json([]);
  }

  let query = supabaseServer
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false });

  if (session.role !== "owner" && session.role !== "admin") {
    query = query.eq("owner_id", session.sub);
  }
  if (industry) query = query.eq("industry", industry);
  if (neighborhoodCompanyIds) query = query.in("id", neighborhoodCompanyIds);
  if (search) query = query.ilike("name", `%${search}%`);
  if (hasEmail) query = query.not("email", "is", null).neq("email", "");
  if (email) query = query.ilike("email", `%${email}%`);
  if (limit) query = query.limit(parseInt(limit));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { data, error } = await supabaseServer
    .from("companies")
    .insert({ ...body, owner_id: session.sub })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
