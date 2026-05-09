import { getSession } from "@/lib/auth/session";
import { UpdateTaskSchema } from "@/lib/crm/schemas";
import { supabaseServer } from "@/lib/supabase-server";
import { validateJsonBody } from "@/lib/validation";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const validated = await validateJsonBody(req, UpdateTaskSchema);
  if ('response' in validated) return validated.response;

  const { data, error } = await supabaseServer
    .from("tasks")
    .update({ ...validated.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
