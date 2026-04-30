import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getCurrentDbUserId } from "@/lib/prospecting/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ searchId: string }> }) {
  const { searchId } = await params;
  const { dbUserId, error: authError } = await getCurrentDbUserId();
  if (authError === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!dbUserId) return NextResponse.json({ error: authError ?? "Unauthorized" }, { status: 401 });

  const { data: search, error: searchError } = await supabaseServer
    .from("prospect_searches")
    .select("*")
    .eq("id", searchId)
    .eq("user_id", dbUserId)
    .maybeSingle();

  if (searchError) return NextResponse.json({ error: searchError.message }, { status: 500 });
  if (!search) return NextResponse.json({ error: "Search not found" }, { status: 404 });

  const { data: results, error: resultsError } = await supabaseServer
    .from("prospect_results")
    .select("*")
    .eq("search_id", searchId)
    .order("created_at", { ascending: true });

  if (resultsError) return NextResponse.json({ error: resultsError.message }, { status: 500 });
  return NextResponse.json({ data: { search, results: results ?? [] } });
}
