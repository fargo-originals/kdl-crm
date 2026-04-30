import { NextResponse } from "next/server";
import { getCurrentDbUserId } from "@/lib/prospecting/auth";
import { processApifyRun } from "@/lib/prospecting/process-apify-run";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const { dbUserId, error: authError } = await getCurrentDbUserId();
  if (authError === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!dbUserId) return NextResponse.json({ error: authError ?? "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { searchId?: string };
  if (!body.searchId) return NextResponse.json({ error: "searchId is required" }, { status: 400 });

  const { data: search, error } = await supabaseServer
    .from("prospect_searches")
    .select("id, apify_run_id")
    .eq("id", body.searchId)
    .eq("user_id", dbUserId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!search) return NextResponse.json({ error: "Search not found" }, { status: 404 });
  if (!search.apify_run_id) return NextResponse.json({ error: "Search has no Apify run" }, { status: 400 });

  const data = await processApifyRun(search.apify_run_id);
  return NextResponse.json({ data });
}
