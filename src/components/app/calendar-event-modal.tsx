"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CalendarPlus, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultTitle?: string;
  defaultEmail?: string;
  dealId?: string;
  leadId?: string;
}

const DURATIONS = [
  { value: 15, label: "15 minutos" },
  { value: 30, label: "30 minutos" },
  { value: 45, label: "45 minutos" },
  { value: 60, label: "1 hora" },
  { value: 90, label: "1h 30min" },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function nextHourStr() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return `${String(d.getHours()).padStart(2, "0")}:00`;
}

export function CalendarEventModal({ open, onClose, defaultTitle = "", defaultEmail = "", dealId, leadId }: Props) {
  const [form, setForm] = useState({
    title: defaultTitle,
    date: todayStr(),
    time: nextHourStr(),
    duration: 30,
    description: "",
    attendee_email: defaultEmail,
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Sync defaultTitle/email when modal opens with new defaults
  function handleOpen(isOpen: boolean) {
    if (isOpen) {
      setForm(f => ({
        ...f,
        title: defaultTitle || f.title,
        attendee_email: defaultEmail || f.attendee_email,
      }));
      setStatus("idle");
    } else {
      onClose();
    }
  }

  async function submit() {
    if (!form.title || !form.date || !form.time) return;
    setSaving(true);
    setStatus("idle");

    const res = await fetch("/api/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        date: form.date,
        time: form.time,
        duration: form.duration,
        description: form.description || undefined,
        attendee_email: form.attendee_email || undefined,
        deal_id: dealId,
        lead_id: leadId,
      }),
    });

    setSaving(false);
    if (res.ok) {
      setStatus("success");
      setTimeout(() => { onClose(); setStatus("idle"); }, 1800);
    } else {
      const data = await res.json();
      setErrorMsg(data.error ?? "Error al crear el evento");
      setStatus("error");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4" />
            Crear evento en Google Calendar
          </DialogTitle>
        </DialogHeader>

        {status === "success" ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="font-medium">Evento creado correctamente</p>
            <p className="text-sm text-muted-foreground">Ya aparece en tu Google Calendar</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Reunión con cliente"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Hora *</Label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={e => setForm({ ...form, time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Duración</Label>
              <Select
                value={String(form.duration)}
                onChange={e => setForm({ ...form, duration: Number(e.target.value) })}
              >
                {DURATIONS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Email del invitado (opcional)</Label>
              <Input
                type="email"
                value={form.attendee_email}
                onChange={e => setForm({ ...form, attendee_email: e.target.value })}
                placeholder="cliente@empresa.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notas (opcional)</Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[72px] resize-none"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Agenda de la reunión..."
              />
            </div>

            {status === "error" && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                onClick={submit}
                disabled={saving || !form.title || !form.date || !form.time}
              >
                {saving ? <Spinner size="sm" tone="current" className="mr-2" /> : null}
                Crear evento
              </Button>
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
