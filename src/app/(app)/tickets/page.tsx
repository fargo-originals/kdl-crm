"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Search, Calendar, User, AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string | null;
  reporter?: { first_name: string; last_name: string };
  company?: { name: string };
  created_at: string;
  resolved_at: string | null;
}

interface Company { id: string; name: string; }

const statusColors: Record<string, "destructive" | "warning" | "secondary" | "success"> = {
  open: "destructive", in_progress: "warning", waiting: "secondary", resolved: "success",
};
const statusLabels: Record<string, string> = {
  open: "Abierto", in_progress: "En progreso", waiting: "Esperando", resolved: "Resuelto",
};
const priorityLabels: Record<string, string> = { low: "Baja", medium: "Media", high: "Alta", urgent: "Urgente" };
const statusIcons: Record<string, typeof AlertCircle> = {
  open: AlertCircle, in_progress: Clock, waiting: Clock, resolved: CheckCircle2,
};

const emptyForm = { title: "", description: "", priority: "medium", category: "", company_id: "" };

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadTickets();
    fetch("/api/companies").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setCompanies(data);
    });
  }, []);

  async function loadTickets() {
    setLoading(true);
    const res = await fetch("/api/tickets");
    const data = await res.json();
    setTickets(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function handleCreate() {
    if (!form.title || !form.description) return;
    setSaving(true);
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        priority: form.priority,
        category: form.category || null,
        company_id: form.company_id || null,
        status: "open",
      }),
    });
    if (res.ok) { setOpen(false); setForm(emptyForm); await loadTickets(); }
    setSaving(false);
  }

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.company?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || t.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tickets</h1>
          <p className="text-muted-foreground">Gestiona las solicitudes de soporte</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nuevo ticket</Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar tickets..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2">
          {["all", "open", "in_progress", "resolved"].map((f) => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
              {f === "all" ? "Todos" : statusLabels[f]}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filteredTickets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No hay tickets todavía</p>
          <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Crear primer ticket</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTickets.map((ticket) => {
            const StatusIcon = statusIcons[ticket.status] || AlertCircle;
            return (
              <Card key={ticket.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`h-4 w-4 ${ticket.status === "resolved" ? "text-green-500" : "text-muted-foreground"}`} />
                      <CardTitle className="text-sm text-muted-foreground">#{ticket.id.slice(0, 8)}</CardTitle>
                    </div>
                    <Badge variant={statusColors[ticket.status]}>{statusLabels[ticket.status]}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="font-medium mb-2 line-clamp-2">{ticket.title}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="secondary">{priorityLabels[ticket.priority] || ticket.priority}</Badge>
                    {ticket.category && <Badge variant="outline">{ticket.category}</Badge>}
                    {ticket.company?.name && <Badge variant="outline">{ticket.company.name}</Badge>}
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    {ticket.reporter && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {ticket.reporter.first_name} {ticket.reporter.last_name?.[0]}.
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(ticket.created_at).toLocaleDateString("es-ES")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nuevo ticket</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="ticket-title">Título *</Label>
              <Input id="ticket-title" placeholder="Breve descripción del problema" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ticket-desc">Descripción *</Label>
              <Textarea id="ticket-desc" placeholder="Describe el problema en detalle..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="ticket-priority">Prioridad</Label>
                <Select id="ticket-priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ticket-category">Categoría</Label>
                <Input id="ticket-category" placeholder="Bug, Feature..." value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ticket-company">Empresa</Label>
              <Select id="ticket-company" value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
                <option value="">Sin empresa</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving || !form.title || !form.description}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : "Crear ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
