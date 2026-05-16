import { getSession } from "@/lib/auth/session";
import { UpdateDealSchema } from "@/lib/crm/schemas";
import { supabaseServer } from "@/lib/supabase-server";
import { validateJsonBody } from "@/lib/validation";
import { NextResponse } from "next/server";
import { runAutomation } from "@/lib/automations/engine";
import { writeAudit } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const validated = await validateJsonBody(req, UpdateDealSchema);
  if ('response' in validated) return validated.response;

  // Fetch previous stage for automation context
  const { data: prevDeal } = await supabaseServer
    .from("deals")
    .select("stage, name, value, owner_id")
    .eq("id", id)
    .single();

  const updatePayload = {
    ...validated.data,
    updated_at: new Date().toISOString(),
  };

  let query = supabaseServer
    .from("deals")
    .update(updatePayload)
    .eq("id", id);

  if (session.role !== "owner" && session.role !== "admin") {
    query = query.eq("owner_id", session.sub);
  }

  const { data, error } = await query.select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fire deal_stage_change automation if stage changed (non-blocking)
  if (prevDeal && validated.data.stage && validated.data.stage !== prevDeal.stage) {
    runAutomation('deal_stage_change', id, {
      deal_name: data.name,
      stage: data.stage,
      previous_stage: prevDeal.stage,
      value: data.value,
    }, data.owner_id ?? session.sub).catch(console.error);
  }

  // Audit log
  writeAudit({
    entityType: 'deal',
    entityId: id,
    action: 'update',
    changedBy: session.sub,
    oldValues: prevDeal ? { stage: prevDeal.stage, value: prevDeal.value } : undefined,
    newValues: validated.data as Record<string, unknown>,
  });

  return NextResponse.json(data);
}
