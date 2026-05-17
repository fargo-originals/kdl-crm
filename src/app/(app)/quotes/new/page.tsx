"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

interface Deal { id: string; name: string; company?: { name: string } | null; }
interface Company { id: string; name: string; }
interface Contact { id: string; first_name: string; last_name: string; }

export default function NewQuotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledDealId = searchParams.get("deal_id") ?? "";

  const [deals, setDeals] = useState<Deal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    deal_id: prefilledDealId,
    company_id: "",
    contact_id: "",
    valid_until: "",
    notes: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/deals").then(r => r.json()),
      fetch("/api/companies").then(r => r.json()),
      fetch("/api/contacts").then(r => r.json()),
    ]).then(([dealsData, companiesData, contactsData]) => {
      setDeals(Array.isArray(dealsData) ? dealsData : []);
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
      setContacts(Array.isArray(contactsData) ? contactsData : []);
      setLoading(false);
    });
  }, []);

  async function handleCreate() {
    setCreating(true);
    const res = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deal_id: form.deal_id || null,
        company_id: form.company_id || null,
        contact_id: form.contact_id || null,
        valid_until: form.valid_until || null,
        notes: form.notes || null,
        items: [],
        discount_pct: 0,
      }),
    });
    if (res.ok) {
      const quote = await res.json();
      router.push(`/quotes/${quote.id}`);
    } else {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nuevo presupuesto</h1>
          <p className="text-muted-foreground">Crea y empieza a añadir líneas</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Vincular presupuesto</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Deal (opcional)</Label>
            <Select value={form.deal_id} onChange={e => setForm({ ...form, deal_id: e.target.value })}>
              <option value="">Sin deal</option>
              {deals.map(d => (
                <option key={d.id} value={d.id}>
                  {d.company?.name ? `${d.company.name} — ${d.name}` : d.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Empresa (opcional)</Label>
            <Select value={form.company_id} onChange={e => setForm({ ...form, company_id: e.target.value })}>
              <option value="">Sin empresa</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Contacto (opcional)</Label>
            <Select value={form.contact_id} onChange={e => setForm({ ...form, contact_id: e.target.value })}>
              <option value="">Sin contacto</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Válido hasta (opcional)</Label>
            <Input
              type="date"
              value={form.valid_until}
              onChange={e => setForm({ ...form, valid_until: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button onClick={handleCreate} disabled={creating}>
          {creating ? <><Spinner size="sm" tone="current" className="mr-2" />Creando...</> : "Crear presupuesto"}
        </Button>
      </div>
    </div>
  );
}
