import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getCurrentDbUserId } from "@/lib/prospecting/auth";

const ALLOWED_REVIEW_STATUSES = new Set(["pending", "approved", "discarded"]);

export async function PATCH(req: Request, { params }: { params: Promise<{ resultId: string }> }) {
  const { resultId } = await params;
  const { dbUserId, error: authError } = await getCurrentDbUserId();
  if (authError === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!dbUserId) return NextResponse.json({ error: authError ?? "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { reviewStatus?: string };
  if (!body.reviewStatus || !ALLOWED_REVIEW_STATUSES.has(body.reviewStatus)) {
    return NextResponse.json({ error: "Invalid reviewStatus" }, { status: 400 });
  }

  const { data: result, error: resultError } = await supabaseServer
    .from("prospect_results")
    .select("id, search_id, prospect_searches!inner(user_id)")
    .eq("id", resultId)
    .eq("prospect_searches.user_id", dbUserId)
    .maybeSingle();

  if (resultError) return NextResponse.json({ error: resultError.message }, { status: 500 });
  if (!result) return NextResponse.json({ error: "Result not found" }, { status: 404 });

  const { data, error } = await supabaseServer
    .from("prospect_results")
    .update({ review_status: body.reviewStatus, updated_at: new Date().toISOString() })
    .eq("id", resultId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
