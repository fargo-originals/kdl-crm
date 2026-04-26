"use client";

import { useEffect, useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, DollarSign, User, Loader2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Deal {
  id: string;
  name: string;
  stage: string;
  value: number;
  probability: number;
  currency: string;
  expected_close_date: string | null;
  created_at: string;
  company?: { name: string };
  owner?: { first_name: string; last_name: string };
}

interface Company { id: string; name: string; }

const STAGES = [
  { id: "New", name: "Nuevo", color: "#64748B" },
  { id: "Qualified", name: "Calificado", color: "#2563EB" },
  { id: "Meeting", name: "Reunión", color: "#8B5CF6" },
  { id: "Proposal", name: "Propuesta", color: "#F59E0B" },
  { id: "Negotiation", name: "Negociación", color: "#F97316" },
  { id: "Closed Won", name: "Cerrado Ganado", color: "#16A34A" },
  { id: "Closed Lost", name: "Cerrado Perdido", color: "#DC2626" },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(value);

const emptyForm = { name: "", company_id: "", value: "", probability: "50", stage: "New", expected_close_date: "" };

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const loadDeals = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/deals");
    const data = await res.json();
    setDeals(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDeals();
    fetch("/api/companies").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setCompanies(data);
    });
  }, [loadDeals]);

  async function handleCreate() {
    if (!form.name) return;
    setSaving(true);
    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        company_id: form.company_id || null,
        value: form.value ? parseFloat(form.value) : 0,
        probability: parseInt(form.probability),
        stage: form.stage,
        expected_close_date: form.expected_close_date || null,
        currency: "EUR",
      }),
    });
    if (res.ok) { setOpen(false); setForm(emptyForm); await loadDeals(); }
    setSaving(false);
  }

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const dealId = result.draggableId;
    const newStage = result.destination.droppableId;
    const sourceStage = result.source.droppableId;
    if (newStage === sourceStage) return;

    // Optimistic update
    setDeals((prev) => prev.map((d) => d.id === dealId ? { ...d, stage: newStage } : d));

    await fetch(`/api/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
  }

  const getStageDeals = (stageId: string) => deals.filter((d) => d.stage === stageId);
  const getStageValue = (stageId: string) =>
    getStageDeals(stageId).reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  const getTotalValue = () => deals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground">Gestiona tus oportunidades de venta</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Valor total del pipeline</p>
            <p className="text-2xl font-bold">{formatCurrency(getTotalValue())}</p>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />Nuevo deal
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {STAGES.map((stage) => (
              <div key={stage.id} className="min-w-[240px] flex-shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-sm font-medium">{stage.name}</span>
                    <Badge variant="secondary" className="text-xs">{getStageDeals(stage.id).length}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatCurrency(getStageValue(stage.id))}</span>
                </div>
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[100px] rounded-lg p-2 space-y-2 transition-colors ${snapshot.isDraggingOver ? "bg-accent/60" : "bg-muted/30"}`}
                    >
                      {getStageDeals(stage.id).map((deal, index) => (
                        <Draggable key={deal.id} draggableId={deal.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`rounded-lg border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing ${snapshot.isDragging ? "shadow-lg rotate-1" : "hover:shadow-md"}`}
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-start justify-between gap-1">
                                  <p className="text-sm font-medium leading-tight">{deal.company?.name || deal.name}</p>
                                  <Badge variant="outline" className="text-xs shrink-0">{deal.probability}%</Badge>
                                </div>
                                {deal.company?.name && (
                                  <p className="text-xs text-muted-foreground truncate">{deal.name}</p>
                                )}
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span className="flex items-center gap-0.5">
                                    <DollarSign className="h-3 w-3" />
                                    {formatCurrency(Number(deal.value))}
                                  </span>
                                  {deal.owner && (
                                    <span className="flex items-center gap-0.5">
                                      <User className="h-3 w-3" />
                                      {deal.owner.first_name} {deal.owner.last_name?.[0]}.
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {getStageDeals(stage.id).length === 0 && !snapshot.isDraggingOver && (
                        <p className="text-center text-xs text-muted-foreground py-4">Sin deals</p>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nuevo deal</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="deal-name">Nombre del deal *</Label>
              <Input id="deal-name" placeholder="Ej: Proyecto CRM Q1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="deal-company">Empresa</Label>
              <Select id="deal-company" value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
                <option value="">Sin empresa</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="deal-value">Valor (€)</Label>
                <Input id="deal-value" type="number" placeholder="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="deal-prob">Probabilidad (%)</Label>
                <Input id="deal-prob" type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="deal-stage">Etapa</Label>
                <Select id="deal-stage" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                  {STAGES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="deal-close">Fecha cierre</Label>
                <Input id="deal-close" type="date" value={form.expected_close_date} onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving || !form.name}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : "Crear deal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
