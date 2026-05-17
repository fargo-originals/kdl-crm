"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Pencil, X, Check, Trash2, Building2, User,
  AlertCircle, Clock, CheckCircle2, Calendar,
} from "lucide-react";
import { Spinner, PageSpinner } from "@/components/ui/spinner";
import { ActivityTimeline } from "@/components/app/activity-timeline";

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  reporter?: { id: string; first_name: string; last_name: string } | null;
  assignee?: { id: string; first_name: string; last_name: string } | null;
  company?: { id: string; name: string } | null;
  contact?: { id: string; first_name: string; last_name: string; email: string | null; phone: string | null } | null;
}

const STATUS_FLOW = [
  { key: "open", label: "Abierto", icon: AlertCircle, color: "text-red-500", badge: "destructive" as const },
  { key: "in_progress", label: "En progreso", icon: Clock, color: "text-yellow-500", badge: "warning" as const },
  { key: "waiting", label: "Esperando", icon: Clock, color: "text-blue-500", badge: "secondary" as const },
  { key: "resolved", label: "Resuelto", icon: CheckCircle2, color: "text-green-500", badge: "success" as const },
];

const PRIORITY_LABELS: Record<string, string> = { low: "Baja", medium: "Media", high: "Alta", urgent: "Urgente" };
const PRIORITY_VARIANTS: Record<string, "secondary" | "warning" | "destructive"> = {
  low: "secondary", medium: "secondary", high: "warning", urgent: "destructive",
};

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<Partial<Ticket>>({});

  useEffect(() => {
    fetch(`/api/tickets/${id}`)
      .then(r => r.json())
      .then(data => { setTicket(data); setForm(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    if (!ticket) return;
    setSaving(true);
    const res = await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        status: form.status,
        priority: form.priority,
        category: form.category || null,
        resolution: form.resolution || null,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTicket(updated);
      setForm(updated);
      setEditing(false);
    }
    setSaving(false);
  }

  async function changeStatus(newStatus: string) {
    const res = await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTicket(updated);
      setForm(updated);
    }
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar el ticket "${ticket?.title}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/tickets/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/tickets");
    else setDeleting(false);
  }

  if (loading) return <PageSpinner containerClassName="py-24" />;
  if (!ticket) return (
    <div className="text-center py-24">
      <p className="text-muted-foreground">Ticket no encontrado.</p>
      <Button variant="outline" className="mt-4" onClick={() => router.back()}>Volver</Button>
    </div>
  );

  const currentStatus = STATUS_FLOW.find(s => s.key === ticket.status) ?? STATUS_FLOW[0];
  const StatusIcon = currentStatus.icon;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground font-mono">#{ticket.id.slice(0, 8)}</span>
              <Badge variant={currentStatus.badge}>{currentStatus.label}</Badge>
              <Badge variant={PRIORITY_VARIANTS[ticket.priority] ?? "secondary"}>
                {PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
              </Badge>
              {ticket.category && <Badge variant="outline">{ticket.category}</Badge>}
            </div>
            {editing ? (
              <Input
                className="text-2xl font-bold"
                value={form.title ?? ""}
                onChange={e => setForm({ ...form, title: e.target.value })}
              />
            ) : (
              <h1 className="text-2xl font-bold leading-tight">{ticket.title}</h1>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
              {ticket.company && (
                <Link href={`/companies/${ticket.company.id}`} className="flex items-center gap-1 hover:text-foreground">
                  <Building2 className="h-3.5 w-3.5" />{ticket.company.name}
                </Link>
              )}
              {ticket.reporter && (
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {ticket.reporter.first_name} {ticket.reporter.last_name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(ticket.created_at)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => { setForm(ticket); setEditing(false); }} disabled={saving}>
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

      {/* Status flow — quick change buttons */}
      {!editing && (
        <div className="flex gap-2 flex-wrap">
          {STATUS_FLOW.map(s => {
            const Icon = s.icon;
            const isCurrent = s.key === ticket.status;
            return (
              <button
                key={s.key}
                onClick={() => !isCurrent && changeStatus(s.key)}
                disabled={isCurrent}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors
                  ${isCurrent
                    ? "border-primary bg-primary/5 text-primary cursor-default"
                    : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isCurrent ? "text-primary" : s.color}`} />
                {s.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Description */}
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">Descripción</CardTitle></CardHeader>
          <CardContent>
            {editing ? (
              <Textarea
                rows={5}
                value={form.description ?? ""}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Describe el problema en detalle..."
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">
                {ticket.description || <span className="text-muted-foreground">Sin descripción.</span>}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader><CardTitle className="text-base">Detalles</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Estado</Label>
              {editing ? (
                <Select value={form.status ?? ""} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {STATUS_FLOW.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </Select>
              ) : (
                <div className="flex items-center gap-2 py-2">
                  <StatusIcon className={`h-4 w-4 ${currentStatus.color}`} />
                  <span className="text-sm">{currentStatus.label}</span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label>Prioridad</Label>
              {editing ? (
                <Select value={form.priority ?? ""} onChange={e => setForm({ ...form, priority: e.target.value })}>
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </Select>
              ) : (
                <p className="text-sm py-2">{PRIORITY_LABELS[ticket.priority] ?? ticket.priority}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Categoría</Label>
              {editing ? (
                <Input value={form.category ?? ""} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Bug, Feature, Consulta..." />
              ) : (
                <p className="text-sm py-2">{ticket.category || <span className="text-muted-foreground">—</span>}</p>
              )}
            </div>

            {ticket.resolved_at && (
              <div className="space-y-1">
                <Label>Resuelto el</Label>
                <p className="text-sm py-2 text-green-600">{formatDate(ticket.resolved_at)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resolution + Contacts */}
        <Card>
          <CardHeader><CardTitle className="text-base">Resolución y contexto</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Resolución</Label>
              {editing ? (
                <Textarea
                  rows={4}
                  value={form.resolution ?? ""}
                  onChange={e => setForm({ ...form, resolution: e.target.value })}
                  placeholder="Cómo se resolvió el problema..."
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">
                  {ticket.resolution || <span className="text-muted-foreground">Sin resolución aún.</span>}
                </p>
              )}
            </div>

            {ticket.contact && (
              <div className="space-y-1">
                <Label>Contacto</Label>
                <Link href={`/contacts/${ticket.contact.id}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline py-2">
                  {ticket.contact.first_name} {ticket.contact.last_name}
                </Link>
              </div>
            )}

            {ticket.assignee && (
              <div className="space-y-1">
                <Label>Asignado a</Label>
                <p className="text-sm py-2">{ticket.assignee.first_name} {ticket.assignee.last_name}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardContent className="pt-4">
          <ActivityTimeline filter={{ deal_id: undefined }} />
        </CardContent>
      </Card>
    </div>
  );
}
