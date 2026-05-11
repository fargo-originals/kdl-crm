"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Copy, Check } from "lucide-react";
import { Spinner, PageSpinner } from "@/components/ui/spinner";

const WEEKDAYS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

const DURATION_OPTIONS = [
  { value: 15, label: "15 minutos" },
  { value: 30, label: "30 minutos" },
  { value: 45, label: "45 minutos" },
  { value: 60, label: "1 hora" },
];

interface DayConfig {
  weekday: number;
  active: boolean;
  start_time: string;
  end_time: string;
}

const DEFAULT_DAYS: DayConfig[] = WEEKDAYS.map((d) => ({
  weekday: d.value,
  active: d.value >= 1 && d.value <= 5,
  start_time: "09:00",
  end_time: "18:00",
}));

export default function AvailabilitySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [days, setDays] = useState<DayConfig[]>(DEFAULT_DAYS);
  const [bookingSlug, setBookingSlug] = useState("");
  const [bookingTitle, setBookingTitle] = useState("Consulta gratuita");
  const [slotDuration, setSlotDuration] = useState(30);

  const bookingUrl = bookingSlug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/book/${bookingSlug}`
    : "";

  useEffect(() => {
    fetch("/api/settings/availability")
      .then((r) => r.json())
      .then((data) => {
        setBookingSlug(data.booking_slug ?? "");
        setBookingTitle(data.booking_title ?? "Consulta gratuita");
        setSlotDuration(data.slot_duration_minutes ?? 30);

        if (data.availability && data.availability.length > 0) {
          setDays(
            WEEKDAYS.map((d) => {
              const found = data.availability.find((a: DayConfig) => a.weekday === d.value);
              return {
                weekday: d.value,
                active: !!found,
                start_time: found?.start_time ?? "09:00",
                end_time: found?.end_time ?? "18:00",
              };
            })
          );
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function updateDay(weekday: number, patch: Partial<DayConfig>) {
    setDays((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)));
  }

  async function handleSave() {
    setSaving(true);
    await fetch("/api/settings/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        availability: days,
        booking_slug: bookingSlug,
        booking_title: bookingTitle,
        slot_duration_minutes: slotDuration,
      }),
    });
    setSaving(false);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <PageSpinner containerClassName="py-8" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Disponibilidad</h1>
        <p className="text-muted-foreground">Configura tu horario y genera tu link de reservas</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuración de la reunión</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Título de la reunión</Label>
            <Input
              placeholder="Consulta gratuita de 30 min"
              value={bookingTitle}
              onChange={(e) => setBookingTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Duración de cada cita</Label>
            <Select
              value={String(slotDuration)}
              onChange={(e) => setSlotDuration(Number(e.target.value))}
            >
              {DURATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Tu URL de reservas</Label>
            <div className="flex gap-2">
              <div className="flex items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground shrink-0">
                /book/
              </div>
              <Input
                placeholder="tu-nombre"
                value={bookingSlug}
                onChange={(e) => setBookingSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                className="flex-1"
              />
            </div>
            {bookingUrl && (
              <div className="flex items-center gap-2 mt-2 rounded-md border bg-muted/50 px-3 py-2">
                <span className="text-xs text-muted-foreground flex-1 truncate">{bookingUrl}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={copyLink}>
                  {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Horario semanal</CardTitle>
          <CardDescription>Activa los días en que aceptas reuniones y configura el horario</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {WEEKDAYS.map((wd) => {
            const day = days.find((d) => d.weekday === wd.value)!;
            return (
              <div key={wd.value} className="flex items-center gap-4">
                <div className="w-28 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`day-${wd.value}`}
                    className="h-4 w-4 rounded border-input"
                    checked={day.active}
                    onChange={(e) => updateDay(wd.value, { active: e.target.checked })}
                  />
                  <label htmlFor={`day-${wd.value}`} className="text-sm cursor-pointer select-none">
                    {wd.label}
                  </label>
                </div>
                {day.active ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={day.start_time}
                      onChange={(e) => updateDay(wd.value, { start_time: e.target.value })}
                      className="w-28"
                    />
                    <span className="text-sm text-muted-foreground">hasta</span>
                    <Input
                      type="time"
                      value={day.end_time}
                      onChange={(e) => updateDay(wd.value, { end_time: e.target.value })}
                      className="w-28"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No disponible</span>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? <><Spinner size="sm" tone="current" className="mr-2" />Guardando...</> : "Guardar disponibilidad"}
      </Button>
    </div>
  );
}
