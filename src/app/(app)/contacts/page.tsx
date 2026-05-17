"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Search, Mail, Phone, Building2, Trash2, Download } from "lucide-react";
import { Spinner, PageSpinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";


interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  job_title: string;
  company_id: string;
  lifecycle_stage: string;
  created_at: string;
  company?: { name: string };
}

interface Company {
  id: string;
  name: string;
}

const lifecycleColors: Record<string, "default" | "secondary" | "destructive" | "success" | "warning"> = {
  lead: "secondary",
  opportunity: "warning",
  customer: "success",
  inactive: "default",
};

const lifecycleLabels: Record<string, string> = {
  lead: "Lead",
  opportunity: "Oportunidad",
  customer: "Cliente",
  inactive: "Inactivo",
};

const emptyForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  job_title: "",
  company_id: "",
  lifecycle_stage: "lead",
  notes: "",
};

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadContacts();
    loadCompanies();
  }, []);

  async function loadContacts() {
    setLoading(true);
    const res = await fetch("/api/contacts");
    const data = await res.json();
    setContacts(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function loadCompanies() {
    const res = await fetch("/api/companies");
    const data = await res.json();
    if (Array.isArray(data)) setCompanies(data);
  }

  async function handleCreate() {
    if (!form.first_name || !form.last_name) return;
    setSaving(true);

    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email || null,
        phone: form.phone || null,
        job_title: form.job_title || null,
        company_id: form.company_id || null,
        lifecycle_stage: form.lifecycle_stage,
        notes: form.notes || null,
      }),
    });

    if (res.ok) {
      setOpen(false);
      setForm(emptyForm);
      await loadContacts();
    }
    setSaving(false);
  }

  const filteredContacts = contacts.filter(
    (c) =>
      c.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.name?.toLowerCase().includes(search.toLowerCase())
  );

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleAll() {
    setSelected(prev => prev.size === filteredContacts.length && filteredContacts.length > 0
      ? new Set() : new Set(filteredContacts.map(c => c.id)));
  }

  async function bulkExport() {
    const sel = filteredContacts.filter(c => selected.has(c.id));
    const headers = ['Nombre', 'Apellido', 'Email', 'Teléfono', 'Cargo', 'Empresa', 'Etapa'];
    const rows = sel.map(c => [c.first_name, c.last_name, c.email ?? '', c.phone ?? '', c.job_title ?? '', c.company?.name ?? '', c.lifecycle_stage]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `contactos-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    setSelected(new Set());
  }

  async function bulkDelete() {
    if (!confirm(`¿Eliminar ${selected.size} contacto${selected.size !== 1 ? 's' : ''}?`)) return;
    await fetch('/api/contacts/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...selected], action: 'delete' }) });
    setSelected(new Set());
    loadContacts();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contactos</h1>
          <p className="text-muted-foreground">Gestiona tus contactos y leads</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={toggleAll}>
            {selected.size === filteredContacts.length && filteredContacts.length > 0 ? 'Deseleccionar' : 'Sel. todos'}
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo contacto
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar contactos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Contactos ({filteredContacts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <PageSpinner containerClassName="py-8" />
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No hay contactos todavía</p>
              <Button onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Crear primer contacto
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {filteredContacts.map((contact) => {
                const isSelected = selected.has(contact.id);
                return (
                <div
                  key={contact.id}
                  className={cn("flex items-center gap-3 py-3 hover:bg-accent/50 cursor-pointer rounded-md px-2", isSelected && "bg-primary/5")}
                  onClick={() => router.push(`/contacts/${contact.id}`)}
                >
                  {/* Checkbox */}
                  <div onClick={e => toggleSelect(contact.id, e)} className="shrink-0 cursor-pointer">
                    <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                      isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40 hover:border-primary')}>
                      {isSelected && <svg className="w-2.5 h-2.5 text-primary-foreground" fill="currentColor" viewBox="0 0 12 12"><path d="M10 3L5 8.5L2 5.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      {contact.first_name?.[0]?.toUpperCase()}
                      {contact.last_name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">
                        {contact.first_name} {contact.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Building2 className="h-3 w-3" />
                        {contact.company?.name || "Sin empresa"}
                        {contact.job_title && ` · ${contact.job_title}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={lifecycleColors[contact.lifecycle_stage] || "default"}>
                      {lifecycleLabels[contact.lifecycle_stage] || contact.lifecycle_stage}
                    </Badge>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      {contact.email && (
                        <Button variant="ghost" size="icon" asChild>
                          <a href={`mailto:${contact.email}`}>
                            <Mail className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {contact.phone && (
                        <Button variant="ghost" size="icon" asChild>
                          <a href={`tel:${contact.phone}`}>
                            <Phone className="h-4 w-4" />
                          </a>
                        </Button>
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

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border bg-card shadow-lg px-4 py-2.5">
          <span className="text-sm font-medium text-muted-foreground mr-1">{selected.size} seleccionado{selected.size !== 1 ? 's' : ''}</span>
          <Button size="sm" variant="outline" onClick={bulkExport}>
            <Download className="h-3.5 w-3.5 mr-1.5" />Exportar CSV
          </Button>
          <Button size="sm" variant="destructive" onClick={bulkDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />Eliminar
          </Button>
          <button onClick={() => setSelected(new Set())} className="ml-1 text-muted-foreground hover:text-foreground text-sm">✕</button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo contacto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="first_name">Nombre *</Label>
                <Input
                  id="first_name"
                  placeholder="Nombre"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="last_name">Apellido *</Label>
                <Input
                  id="last_name"
                  placeholder="Apellido"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@empresa.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  placeholder="+34 600 000 000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="job_title">Cargo</Label>
                <Input
                  id="job_title"
                  placeholder="CEO, Director..."
                  value={form.job_title}
                  onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="company_id">Empresa</Label>
                <Select
                  id="company_id"
                  value={form.company_id}
                  onChange={(e) => setForm({ ...form, company_id: e.target.value })}
                >
                  <option value="">Sin empresa</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="lifecycle_stage">Etapa</Label>
                <Select
                  id="lifecycle_stage"
                  value={form.lifecycle_stage}
                  onChange={(e) => setForm({ ...form, lifecycle_stage: e.target.value })}
                >
                  <option value="lead">Lead</option>
                  <option value="opportunity">Oportunidad</option>
                  <option value="customer">Cliente</option>
                  <option value="inactive">Inactivo</option>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving || !form.first_name || !form.last_name}>
              {saving ? <><Spinner size="sm" tone="current" className="mr-2" />Guardando...</> : "Crear contacto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
