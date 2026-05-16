"use client";

import { useEffect, useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, DollarSign, User, CalendarPlus, Settings2 } from "lucide-react";
import { Spinner, PageSpinner } from "@/components/ui/spinner";
import { CalendarEventModal } from "@/components/app/calendar-event-modal";
import Link from "next/link";

interface Deal {
  id: string;
  name: string;
  stage: string;
  value: number;
  probability: number;
  currency: string;
  pipeline_id: string | null;
  expected_close_date: string | null;
  created_at: string;
  company?: { name: string };
  owner?: { first_name: string; last_name: string };
}

interface Stage {
  id: string;
  name: string;
  color: string;
  position: number;
  probability_default: number;
  is_won: boolean;
  is_lost: boolean;
}

interface Pipeline {
  id: string;
  name: string;
  is_default: boolean;
  stages: Stage[];
}

interface Company { id: string; name: string; }

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(value);

const emptyForm = { name: "", company_id: "", value: "", probability: "50", stage: "", expected_close_date: "" };

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [calendarDeal, setCalendarDeal] = useState<Deal | null>(null);

  const activePipeline = pipelines.find(p => p.id === selectedPipelineId) ?? null;
  const stages = (activePipeline?.stages ?? []).sort((a, b) => a.position - b.position);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [dealsRes, pipelinesRes, companiesRes] = await Promise.all([
      fetch("/api/deals").then(r => r.json()),
      fetch("/api/pipelines").then(r => r.json()),
      fetch("/api/companies").then(r => r.json()),
    ]);

    const pipelineList: Pipeline[] = Array.isArray(pipelinesRes) ? pipelinesRes : [];
    setPipelines(pipelineList);
    setDeals(Array.isArray(dealsRes) ? dealsRes : []);
    if (Array.isArray(companiesRes)) setCompanies(companiesRes);

    // Select default pipeline if not yet selected
    setSelectedPipelineId(prev => {
      if (prev && pipelineList.find(p => p.id === prev)) return prev;
      return pipelineList.find(p => p.is_default)?.id ?? pipelineList[0]?.id ?? null;
    });

    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // When pipeline changes, reset stage in form to first stage of new pipeline
  useEffect(() => {
    if (stages.length > 0) {
      setForm(f => ({ ...f, stage: stages[0].name }));
    }
  }, [selectedPipelineId]); // eslint-disable-line react-hooks/exhaustive-deps

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
        stage: form.stage || stages[0]?.name || "Nuevo",
        pipeline_id: selectedPipelineId ?? null,
        expected_close_date: form.expected_close_date || null,
        currency: "EUR",
      }),
    });
    if (res.ok) { setOpen(false); setForm(emptyForm); await loadAll(); }
    setSaving(false);
  }

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const dealId = result.draggableId;
    const newStage = result.destination.droppableId;
    const sourceStage = result.source.droppableId;
    if (newStage === sourceStage) return;
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage } : d));
    await fetch(`/api/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
  }

  // Filter deals by selected pipeline
  const pipelineDeals = deals.filter(d =>
    selectedPipelineId ? d.pipeline_id === selectedPipelineId : true
  );

  const getStageDeals = (stageName: string) => pipelineDeals.filter(d => d.stage === stageName);
  const getStageValue = (stageName: string) =>
    getStageDeals(stageName).reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  const getTotalValue = () => pipelineDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground">Gestiona tus oportunidades de venta</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Pipeline selector */}
          {pipelines.length > 1 && (
            <div className="flex gap-1.5">
              {pipelines.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPipelineId(p.id)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedPipelineId === p.id
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Valor total</p>
            <p className="text-xl font-bold">{formatCurrency(getTotalValue())}</p>
          </div>
          <Link href="/settings/pipeline">
            <Button variant="outline" size="icon" title="Gestionar pipelines">
              <Settings2 className="h-4 w-4" />
            </Button>
          </Link>
          <Button onClick={() => { setForm({ ...emptyForm, stage: stages[0]?.name ?? '' }); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />Nuevo deal
          </Button>
        </div>
      </div>

      {loading ? (
        <PageSpinner />
      ) : stages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-muted-foreground">Este pipeline no tiene etapas.</p>
            <Link href="/settings/pipeline">
              <Button variant="outline"><Settings2 className="mr-2 h-4 w-4" />Configurar etapas</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {stages.map((stage) => (
              <div key={stage.name} className="min-w-[240px] flex-shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-sm font-medium">{stage.name}</span>
                    <Badge variant="secondary" className="text-xs">{getStageDeals(stage.name).length}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatCurrency(getStageValue(stage.name))}</span>
                </div>
                <Droppable droppableId={stage.name}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[100px] rounded-lg p-2 space-y-2 transition-colors ${snapshot.isDraggingOver ? "bg-accent/60" : "bg-muted/30"}`}
                    >
                      {getStageDeals(stage.name).map((deal, index) => (
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
                                  <div className="flex items-center gap-1.5">
                                    {deal.owner && (
                                      <span className="flex items-center gap-0.5">
                                        <User className="h-3 w-3" />
                                        {deal.owner.first_name} {deal.owner.last_name?.[0]}.
                                      </span>
                                    )}
                                    <button
                                      onMouseDown={e => e.stopPropagation()}
                                      onClick={e => { e.stopPropagation(); setCalendarDeal(deal); }}
                                      className="text-muted-foreground hover:text-primary transition-colors"
                                      title="Crear evento en Calendar"
                                    >
                                      <CalendarPlus className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {getStageDeals(stage.name).length === 0 && !snapshot.isDraggingOver && (
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
              <Input id="deal-name" placeholder="Ej: Proyecto CRM Q1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="deal-company">Empresa</Label>
              <Select id="deal-company" value={form.company_id} onChange={e => setForm({ ...form, company_id: e.target.value })}>
                <option value="">Sin empresa</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="deal-value">Valor (€)</Label>
                <Input id="deal-value" type="number" placeholder="0" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="deal-prob">Probabilidad (%)</Label>
                <Input id="deal-prob" type="number" min="0" max="100" value={form.probability} onChange={e => setForm({ ...form, probability: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="deal-stage">Etapa</Label>
                <Select id="deal-stage" value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })}>
                  {stages.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="deal-close">Fecha cierre</Label>
                <Input id="deal-close" type="date" value={form.expected_close_date} onChange={e => setForm({ ...form, expected_close_date: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving || !form.name}>
              {saving ? <><Spinner size="sm" tone="current" className="mr-2" />Guardando...</> : "Crear deal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {calendarDeal && (
        <CalendarEventModal
          open={!!calendarDeal}
          onClose={() => setCalendarDeal(null)}
          defaultTitle={`Reunión: ${calendarDeal.company?.name ?? calendarDeal.name}`}
          dealId={calendarDeal.id}
        />
      )}
    </div>
  );
}
