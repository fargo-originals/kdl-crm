import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getCurrentDbUserId } from "@/lib/prospecting/auth";
import { importProspectToCRM, type ProspectResultForImport } from "@/lib/prospecting/import-to-crm";

export async function POST(req: Request) {
  const { dbUserId, error: authError } = await getCurrentDbUserId();
  if (authError === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!dbUserId) return NextResponse.json({ error: authError ?? "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { resultIds?: string[] };
  if (!Array.isArray(body.resultIds) || body.resultIds.length === 0) {
    return NextResponse.json({ error: "resultIds is required" }, { status: 400 });
  }

  const { data: results, error } = await supabaseServer
    .from("prospect_results")
    .select("*, prospect_searches!inner(user_id, sector)")
    .in("id", body.resultIds)
    .eq("prospect_searches.user_id", dbUserId)
    .eq("review_status", "approved")
    .is("imported_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!results || results.length === 0) {
    return NextResponse.json({ error: "No approved results to import" }, { status: 400 });
  }

  const imported: Array<{ resultId: string; contactId: string | null; companyId: string | null }> = [];

  for (const result of results as ProspectResultForImport[]) {
    const created = await importProspectToCRM(result, dbUserId);
    await supabaseServer
      .from("prospect_results")
      .update({
        imported_at: new Date().toISOString(),
        imported_contact_id: created.contactId,
        imported_company_id: created.companyId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", result.id);

    imported.push({ resultId: result.id, ...created });
  }

  const searchIds = [...new Set((results as Array<{ search_id: string }>).map((result) => result.search_id))];
  for (const searchId of searchIds) {
    const { count } = await supabaseServer
      .from("prospect_results")
      .select("*", { count: "exact", head: true })
      .eq("search_id", searchId)
      .not("imported_at", "is", null);

    await supabaseServer
      .from("prospect_searches")
      .update({ imported_count: count ?? 0, updated_at: new Date().toISOString() })
      .eq("id", searchId);
  }

  return NextResponse.json({ data: { imported } });
}
