"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface LeadFormData {
  full_name: string;
  email: string;
  phone: string;
  business_name: string;
  business_type: string;
  service_interest: string;
  budget_range: string;
  preferred_channel: string;
  preferred_time_window: string;
  message: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  leadId: string;
  initial: Partial<LeadFormData>;
  onSaved: () => void;
}

export function LeadEditModal({ open, onClose, leadId, initial, onSaved }: Props) {
  const [form, setForm] = useState<LeadFormData>({
    full_name: initial.full_name ?? "",
    email: initial.email ?? "",
    phone: initial.phone ?? "",
    business_name: initial.business_name ?? "",
    business_type: initial.business_type ?? "",
    service_interest: initial.service_interest ?? "",
    budget_range: initial.budget_range ?? "",
    preferred_channel: initial.preferred_channel ?? "email",
    preferred_time_window: initial.preferred_time_window ?? "",
    message: initial.message ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof LeadFormData>(key: K, value: LeadFormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo guardar");
        return;
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar lead</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="full_name">Nombre completo</Label>
            <Input id="full_name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+34..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="business_name">Empresa</Label>
            <Input id="business_name" value={form.business_name} onChange={(e) => set("business_name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="business_type">Sector</Label>
            <Input id="business_type" value={form.business_type} onChange={(e) => set("business_type", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="service_interest">Servicio</Label>
            <Input id="service_interest" value={form.service_interest} onChange={(e) => set("service_interest", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget_range">Presupuesto</Label>
            <Input id="budget_range" value={form.budget_range} onChange={(e) => set("budget_range", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferred_channel">Canal preferido</Label>
            <Select
              id="preferred_channel"
              value={form.preferred_channel}
              onChange={(e) => set("preferred_channel", e.target.value)}
            >
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="phone">Teléfono</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferred_time_window">Horario preferido</Label>
            <Input
              id="preferred_time_window"
              value={form.preferred_time_window}
              onChange={(e) => set("preferred_time_window", e.target.value)}
              placeholder="mañanas, 09:00-14:00..."
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="message">Mensaje / notas</Label>
            <Textarea
              id="message"
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              rows={4}
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Spinner /> : "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
