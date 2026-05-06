import { getSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase-server";
import { canAssignRole, canManage, isValidRole } from "@/lib/auth/roles";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Prevent self-modification via this endpoint (use /settings/profile for that)
  if (id === session.sub) {
    return NextResponse.json({ error: "No puedes modificar tu propio usuario aquí" }, { status: 403 });
  }

  // Fetch the target user to know their current role
  const { data: target } = await supabaseServer.from("users").select("id, role").eq("id", id).single();
  if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  if (!canManage(session.role, target.role)) {
    return NextResponse.json({ error: "Sin permisos para modificar este usuario" }, { status: 403 });
  }

  const body = await req.json() as Record<string, unknown>;
  const allowed: Record<string, unknown> = {};

  // Whitelist updatable fields
  if ('active' in body) allowed.active = Boolean(body.active);

  if ('role' in body) {
    const newRole = body.role as string;
    if (!isValidRole(newRole)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }
    if (!canAssignRole(session.role, newRole)) {
      return NextResponse.json({ error: "Sin permisos para asignar ese rol" }, { status: 403 });
    }
    allowed.role = newRole;
  }

  if ('first_name' in body) allowed.first_name = body.first_name;
  if ('last_name' in body) allowed.last_name = body.last_name;

  allowed.updated_at = new Date().toISOString();

  const { data, error } = await supabaseServer
    .from("users")
    .update(allowed)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  if (id === session.sub) {
    return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 403 });
  }

  const { data: target } = await supabaseServer.from("users").select("id, role").eq("id", id).single();
  if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  if (!canManage(session.role, target.role)) {
    return NextResponse.json({ error: "Sin permisos para eliminar este usuario" }, { status: 403 });
  }

  const { error } = await supabaseServer.from("users").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
