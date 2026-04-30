import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getCurrentDbUserId } from "@/lib/prospecting/auth";

export async function GET() {
  const { dbUserId, error: authError } = await getCurrentDbUserId();
  if (authError === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!dbUserId) return NextResponse.json({ error: authError ?? "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseServer
    .from("prospect_searches")
    .select("*")
    .eq("user_id", dbUserId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}
