import { requireAdmin } from "@/lib/auth/session";
import { canAssignRole, isValidRole } from "@/lib/auth/roles";
import { supabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await requireAdmin({ redirectTo: null });
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabaseServer
    .from("users")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const session = await requireAdmin({ redirectTo: null });
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { email, first_name, last_name, role = "seller" } = body;

  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  if (!isValidRole(role)) return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  if (!canAssignRole(session.role, role)) {
    return NextResponse.json({ error: "Sin permisos para asignar ese rol" }, { status: 403 });
  }

  const { data, error } = await supabaseServer
    .from("users")
    .insert({ email, first_name, last_name, role, active: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
