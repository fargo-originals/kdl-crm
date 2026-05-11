"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

interface UserInfo {
  name: string;
  title: string;
  duration: number;
  avatar_url: string | null;
}

interface DaySlots {
  date: string;
  slots: string[];
}

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [info, setInfo] = useState<UserInfo | null>(null);
  const [days, setDays] = useState<DaySlots[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [step, setStep] = useState<"pick" | "form" | "submitting">("pick");

  const [form, setForm] = useState({ visitor_name: "", visitor_email: "", visitor_phone: "", message: "" });
  const [formError, setFormError] = useState("");

  // Week navigation
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch(`/api/public/book/${slug}/info`),
      fetch(`/api/public/book/${slug}/slots`),
    ]).then(async ([infoRes, slotsRes]) => {
      if (!infoRes.ok) { setNotFound(true); return; }
      const [infoData, slotsData] = await Promise.all([infoRes.json(), slotsRes.json()]);
      setInfo(infoData);
      setDays(slotsData.days ?? []);
      setLoadingSlots(false);
    }).catch(() => { setNotFound(true); });
  }, [slug]);

  // Slice days for current week view (7 days per page)
  const weekDays = days.slice(weekOffset * 7, weekOffset * 7 + 7);
  const totalWeeks = Math.ceil(days.length / 7);

  function selectSlot(date: string, slot: string) {
    setSelectedDate(date);
    setSelectedSlot(slot);
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T12:00:00");
    return `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_ES[d.getMonth()]}`;
  }

  async function handleSubmit() {
    if (!form.visitor_name.trim() || !form.visitor_email.trim()) {
      setFormError("Nombre y email son obligatorios");
      return;
    }
    setFormError("");
    setStep("submitting");

    const slotIso = `${selectedDate}T${selectedSlot}:00`;
    const res = await fetch(`/api/public/book/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slot: slotIso,
        visitor_name: form.visitor_name,
        visitor_email: form.visitor_email,
        visitor_phone: form.visitor_phone || null,
        message: form.message || null,
      }),
    });

    if (res.ok) {
      router.push(`/book/${slug}/booked?name=${encodeURIComponent(form.visitor_name)}&date=${encodeURIComponent(formatDate(selectedDate!))}&time=${selectedSlot}&title=${encodeURIComponent(info?.title ?? "")}`);
    } else {
      const err = await res.json();
      setFormError(err.error ?? "Error al reservar. Inténtalo de nuevo.");
      setStep("form");
    }
  }

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-2">
        <p className="text-2xl font-bold">Página no encontrada</p>
        <p className="text-muted-foreground">Este link de reservas no existe o ya no está activo.</p>
      </div>
    </div>
  );

  if (!info) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10 space-y-2">
          {info.avatar_url && (
            <img src={info.avatar_url} alt={info.name} className="w-16 h-16 rounded-full mx-auto object-cover" />
          )}
          <h1 className="text-2xl font-bold">{info.title}</h1>
          <p className="text-muted-foreground">con {info.name}</p>
          <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{info.duration} minutos</span>
          </div>
        </div>

        {step === "pick" && (
          <div className="space-y-6">
            {loadingSlots ? (
              <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : days.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarDays className="mx-auto h-10 w-10 mb-3 opacity-40" />
                <p>No hay horarios disponibles en los próximos días.</p>
                <p className="text-sm mt-1">Contacta directamente por WhatsApp o email.</p>
              </div>
            ) : (
              <>
                {/* Week navigation */}
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon" onClick={() => setWeekOffset(w => Math.max(0, w - 1))} disabled={weekOffset === 0}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium text-muted-foreground">
                    {weekDays[0] ? formatDate(weekDays[0].date) : ""} — {weekDays[weekDays.length - 1] ? formatDate(weekDays[weekDays.length - 1].date) : ""}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => setWeekOffset(w => Math.min(totalWeeks - 1, w + 1))} disabled={weekOffset >= totalWeeks - 1}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Days + slots */}
                <div className="space-y-4">
                  {weekDays.map((day) => (
                    <div key={day.date}>
                      <p className="text-sm font-medium mb-2 text-muted-foreground">{formatDate(day.date)}</p>
                      <div className="flex flex-wrap gap-2">
                        {day.slots.map((slot) => {
                          const isSelected = selectedDate === day.date && selectedSlot === slot;
                          return (
                            <button
                              key={slot}
                              onClick={() => selectSlot(day.date, slot)}
                              className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background hover:bg-accent border-input"
                              }`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedDate && selectedSlot && (
                  <div className="text-center pt-2">
                    <Button onClick={() => setStep("form")} size="lg">
                      Continuar — {formatDate(selectedDate)} a las {selectedSlot}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {(step === "form" || step === "submitting") && (
          <div className="space-y-6">
            <div className="rounded-lg border bg-muted/50 px-4 py-3 flex items-center gap-3">
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">{formatDate(selectedDate!)} a las {selectedSlot}</p>
                <p className="text-xs text-muted-foreground">{info.duration} minutos · {info.title}</p>
              </div>
              <button
                className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setStep("pick")}
              >
                Cambiar
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="name">Tu nombre *</Label>
                <Input
                  id="name"
                  placeholder="Juan García"
                  value={form.visitor_name}
                  onChange={(e) => setForm({ ...form, visitor_name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="juan@turestaurante.com"
                  value={form.visitor_email}
                  onChange={(e) => setForm({ ...form, visitor_email: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">Teléfono (opcional)</Label>
                <Input
                  id="phone"
                  placeholder="+34 600 000 000"
                  value={form.visitor_phone}
                  onChange={(e) => setForm({ ...form, visitor_phone: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="message">¿Sobre qué quieres hablar? (opcional)</Label>
                <textarea
                  id="message"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none"
                  placeholder="Tenemos un restaurante y necesitamos renovar la web..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={step === "submitting"}
            >
              {step === "submitting"
                ? <><Spinner size="sm" tone="current" className="mr-2" />Reservando...</>
                : "Confirmar reserva"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
