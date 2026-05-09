import { getSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

function canManagePipeline(role: string) {
  return role === "owner" || role === "admin";
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseServer
    .from("pipeline_stages")
    .select("*")
    .order("position");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePipeline(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, position, color, probability_default, is_won = false, is_lost = false } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("pipeline_stages")
    .insert({
      name: name.trim(),
      position,
      color,
      probability_default,
      is_won,
      is_lost,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
