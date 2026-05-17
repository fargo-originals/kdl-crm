"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Pencil, X, Check, DollarSign, Building2, User,
  CalendarDays, Trash2, FileText, Plus, CheckSquare,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Spinner, PageSpinner } from "@/components/ui/spinner";
import { ActivityTimeline } from "@/components/app/activity-timeline";

interface Deal {
  id: string;
  name: string;
  stage: string;
  value: number;
  probability: number;
  currency: string;
  pipeline_id: string | null;
  expected_close_date: string | null;
  closed_at: string | null;
  won_reason: string | null;
  lost_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  company?: { id: string; name: string } | null;
  contact?: { id: string; first_name: string; last_name: string; email: string | null; phone: string | null } | null;
  owner?: { id: string; first_name: string; last_name: string } | null;
}

interface Stage { id: string; name: string; color: string; is_won: boolean; is_lost: boolean; }
interface Quote { id: string; number: string; status: string; total: number; created_at: string; }
interface Task { id: string; title: string; status: string; priority: string; due_date: string | null; }

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(value);

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "—";

const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: "Borrador", sent: "Enviado", accepted: "Aceptado", rejected: "Rechazado",
};
const QUOTE_STATUS_VARIANTS: Record<string, "secondary" | "warning" | "success" | "destructive"> = {
  draft: "secondary", sent: "warning", accepted: "success", rejected: "destructive",
};

const TASK_PRIORITY_LABELS: Record<string, string> = { low: "Baja", medium: "Media", high: "Alta", urgent: "Urgente" };
const TASK_STATUS_LABELS: Record<string, string> = { todo: "Pendiente", in_progress: "En progreso", done: "Hecha", completed: "Completada" };

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<Partial<Deal>>({});

  // Task creation
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", priority: "medium", due_date: "" });
  const [savingTask, setSavingTask] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/deals/${id}`).then(r => r.json()),
      fetch("/api/pipeline/stages").then(r => r.json()),
      fetch(`/api/quotes?deal_id=${id}`).then(r => r.json()),
      fetch(`/api/tasks?deal_id=${id}`).then(r => r.json()),
    ]).then(([dealData, stagesData, quotesData, tasksData]) => {
      setDeal(dealData);
      setForm(dealData);
      setStages(Array.isArray(stagesData) ? stagesData : []);
      setQuotes(Array.isArray(quotesData) ? quotesData : []);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    if (!deal) return;
    setSaving(true);
    const res = await fetch(`/api/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        value: form.value,
        probability: form.probability,
        stage: form.stage,
        expected_close_date: form.expected_close_date || null,
        notes: form.notes || null,
        won_reason: form.won_reason || null,
        lost_reason: form.lost_reason || null,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDeal(updated);
      setForm(updated);
      setEditing(false);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar el deal "${deal?.name}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/deals/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/deals");
    else setDeleting(false);
  }

  async function handleCreateTask() {
    if (!taskForm.title) return;
    setSavingTask(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: taskForm.title,
        priority: taskForm.priority,
        due_date: taskForm.due_date || null,
        deal_id: id,
        status: "todo",
      }),
    });
    if (res.ok) {
      const newTask = await res.json();
      setTasks(prev => [newTask, ...prev]);
      setTaskOpen(false);
      setTaskForm({ title: "", priority: "medium", due_date: "" });
    }
    setSavingTask(false);
  }

  async function toggleTaskDone(task: Task) {
    const newStatus = task.status === "done" || task.status === "completed" ? "todo" : "done";
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, completed_at: newStatus === "done" ? new Date().toISOString() : null }),
    });
  }

  if (loading) return <PageSpinner containerClassName="py-24" />;
  if (!deal) return (
    <div className="text-center py-24">
      <p className="text-muted-foreground">Deal no encontrado.</p>
      <Button variant="outline" className="mt-4" onClick={() => router.back()}>Volver</Button>
    </div>
  );

  const currentStage = stages.find(s => s.name === deal.stage);
  const stageColor = currentStage?.color ?? "#64748b";
  const isWon = currentStage?.is_won ?? false;
  const isLost = currentStage?.is_lost ?? false;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            {editing ? (
              <Input
                className="text-2xl font-bold h-auto py-1 text-2xl"
                value={form.name ?? ""}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            ) : (
              <h1 className="text-3xl font-bold truncate">{deal.name}</h1>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: stageColor }}
              >
                {deal.stage}
              </span>
              {isWon && <Badge variant="success">Ganado</Badge>}
              {isLost && <Badge variant="destructive">Perdido</Badge>}
              {deal.company && (
                <Link href={`/companies/${deal.company.id}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                  <Building2 className="h-3.5 w-3.5" />{deal.company.name}
                </Link>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => { setForm(deal); setEditing(false); }} disabled={saving}>
                <X className="mr-2 h-4 w-4" />Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Spinner size="sm" tone="current" className="mr-2" /> : <Check className="mr-2 h-4 w-4" />}
                Guardar
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" />Editar
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? <Spinner size="sm" tone="current" className="mr-2" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Eliminar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Deal info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Información del deal</CardTitle></CardHeader>
          <CardContent className="space-y-4">

            {/* Value */}
            <div className="space-y-1">
              <Label>Valor</Label>
              {editing ? (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <Input type="number" value={form.value ?? ""} onChange={e => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} />
                </div>
              ) : (
                <p className="text-2xl font-bold text-primary">{formatCurrency(Number(deal.value))}</p>
              )}
            </div>

            {/* Stage */}
            <div className="space-y-1">
              <Label>Etapa</Label>
              {editing ? (
                <Select value={form.stage ?? ""} onChange={e => setForm({ ...form, stage: e.target.value })}>
                  {stages.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </Select>
              ) : (
                <p className="text-sm py-2">{deal.stage}</p>
              )}
            </div>

            {/* Probability */}
            <div className="space-y-1">
              <Label>Probabilidad</Label>
              {editing ? (
                <Input type="number" min="0" max="100" value={form.probability ?? 50} onChange={e => setForm({ ...form, probability: parseInt(e.target.value) || 0 })} />
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm py-2">{deal.probability}%</p>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${deal.probability}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Close date */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Fecha de cierre esperada</Label>
              {editing ? (
                <Input type="date" value={form.expected_close_date?.split("T")[0] ?? ""} onChange={e => setForm({ ...form, expected_close_date: e.target.value })} />
              ) : (
                <p className="text-sm py-2">{formatDate(deal.expected_close_date)}</p>
              )}
            </div>

            {/* Contact */}
            {deal.contact && (
              <div className="space-y-1">
                <Label className="flex items-center gap-1"><User className="h-3.5 w-3.5" />Contacto</Label>
                <Link href={`/contacts/${deal.contact.id}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline py-2">
                  {deal.contact.first_name} {deal.contact.last_name}
                </Link>
              </div>
            )}

            {/* Owner */}
            {deal.owner && (
              <div className="space-y-1">
                <Label>Responsable</Label>
                <p className="text-sm py-2">{deal.owner.first_name} {deal.owner.last_name}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes + Win/Loss reason */}
        <Card>
          <CardHeader><CardTitle className="text-base">Notas</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px] resize-none"
                placeholder="Notas sobre este deal..."
                value={form.notes ?? ""}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">
                {deal.notes || <span className="text-muted-foreground">Sin notas.</span>}
              </p>
            )}

            {(isWon || editing) && (
              <div className="space-y-1">
                <Label className="text-green-600">Motivo de ganado</Label>
                {editing ? (
                  <Input value={form.won_reason ?? ""} onChange={e => setForm({ ...form, won_reason: e.target.value })} placeholder="¿Por qué se ganó?" />
                ) : deal.won_reason ? (
                  <p className="text-sm py-2">{deal.won_reason}</p>
                ) : null}
              </div>
            )}

            {(isLost || editing) && (
              <div className="space-y-1">
                <Label className="text-red-600">Motivo de pérdida</Label>
                {editing ? (
                  <Input value={form.lost_reason ?? ""} onChange={e => setForm({ ...form, lost_reason: e.target.value })} placeholder="¿Por qué se perdió?" />
                ) : deal.lost_reason ? (
                  <p className="text-sm py-2">{deal.lost_reason}</p>
                ) : null}
              </div>
            )}

            <p className="text-xs text-muted-foreground pt-2">
              Creado el {formatDate(deal.created_at)}
              {deal.updated_at && deal.updated_at !== deal.created_at && ` · Actualizado ${formatDate(deal.updated_at)}`}
            </p>
          </CardContent>
        </Card>

        {/* Quotes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />Presupuestos ({quotes.length})
            </CardTitle>
            <Link href={`/quotes/new?deal_id=${id}`}>
              <Button variant="outline" size="sm"><Plus className="h-3.5 w-3.5 mr-1" />Nuevo</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {quotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin presupuestos vinculados.</p>
            ) : (
              <div className="divide-y">
                {quotes.map(q => (
                  <Link key={q.id} href={`/quotes/${q.id}`} className="flex items-center justify-between py-3 hover:bg-accent/30 rounded px-1 gap-2">
                    <div>
                      <p className="text-sm font-medium">{q.number}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(q.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{formatCurrency(Number(q.total))}</span>
                      <Badge variant={QUOTE_STATUS_VARIANTS[q.status] ?? "secondary"}>
                        {QUOTE_STATUS_LABELS[q.status] ?? q.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />Tareas ({tasks.length})
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setTaskOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />Nueva
            </Button>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin tareas vinculadas.</p>
            ) : (
              <div className="divide-y">
                {tasks.map(task => {
                  const isDone = task.status === "done" || task.status === "completed";
                  const isOverdue = task.due_date && !isDone && new Date(task.due_date) < new Date();
                  return (
                    <div key={task.id} className="flex items-center gap-3 py-2.5">
                      <button onClick={() => toggleTaskDone(task)} className="shrink-0">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${isDone ? "bg-green-500 border-green-500" : "border-muted-foreground/40 hover:border-primary"}`}>
                          {isDone && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>}
                        </div>
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${isDone ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{TASK_PRIORITY_LABELS[task.priority] ?? task.priority}</span>
                          {task.due_date && (
                            <span className={isOverdue ? "text-red-500 font-medium" : ""}>
                              {isOverdue && "⚠ "}
                              {new Date(task.due_date).toLocaleDateString("es-ES")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardContent className="pt-4">
          <ActivityTimeline filter={{ deal_id: id }} />
        </CardContent>
      </Card>

      {/* Task creation dialog */}
      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nueva tarea para este deal</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Título *</Label>
              <Input placeholder="Ej: Enviar propuesta" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Prioridad</Label>
                <Select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Fecha límite</Label>
                <Input type="date" value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateTask} disabled={savingTask || !taskForm.title}>
              {savingTask ? <Spinner size="sm" tone="current" className="mr-2" /> : null}
              Crear tarea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
