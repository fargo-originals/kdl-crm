"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarDays, CheckSquare, Clock } from "lucide-react";
import Link from "next/link";

interface Appointment {
  id: string;
  confirmed_slot: string;
  status: string;
  notes: string | null;
  lead?: { full_name?: string; email?: string; phone?: string } | null;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
}

interface DayEvent {
  type: "appointment" | "task";
  id: string;
  title: string;
  time?: string;
  isDone?: boolean;
  isOverdue?: boolean;
  priority?: string;
  rawAppt?: Appointment;
  rawTask?: Task;
}

const DAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-400",
  medium: "bg-blue-400",
  high: "bg-orange-400",
  urgent: "bg-red-500",
};

function getMonthStart(year: number, month: number) {
  return new Date(year, month, 1);
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// Returns 0=Mon … 6=Sun (ISO week)
function getISOWeekDay(date: Date) {
  return (date.getDay() + 6) % 7;
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  const load = useCallback(async () => {
    setLoading(true);
    const [apptRes, taskRes] = await Promise.all([
      fetch(`/api/appointments?month=${monthStr}`).then(r => r.json()),
      fetch("/api/tasks").then(r => r.json()),
    ]);
    setAppointments(Array.isArray(apptRes) ? apptRes : []);
    setTasks(Array.isArray(taskRes) ? taskRes : []);
    setLoading(false);
  }, [monthStr]);

  useEffect(() => { load(); }, [load]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  }
  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDay(today.getDate());
  }

  // Build events map: day → DayEvent[]
  const eventsByDay = new Map<number, DayEvent[]>();

  appointments.forEach(appt => {
    const d = new Date(appt.confirmed_slot);
    if (d.getFullYear() !== year || d.getMonth() !== month) return;
    const day = d.getDate();
    const time = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    const title = appt.lead?.full_name ?? "Visitante";
    if (!eventsByDay.has(day)) eventsByDay.set(day, []);
    eventsByDay.get(day)!.push({ type: "appointment", id: appt.id, title, time, rawAppt: appt });
  });

  tasks.forEach(task => {
    if (!task.due_date) return;
    const d = new Date(task.due_date);
    if (d.getFullYear() !== year || d.getMonth() !== month) return;
    const day = d.getDate();
    const isDone = task.status === "done" || task.status === "completed";
    const isOverdue = !isDone && new Date(task.due_date) < new Date();
    if (!eventsByDay.has(day)) eventsByDay.set(day, []);
    eventsByDay.get(day)!.push({ type: "task", id: task.id, title: task.title, isDone, isOverdue, priority: task.priority, rawTask: task });
  });

  // Calendar grid
  const daysInMonth = getDaysInMonth(year, month);
  const monthStart = getMonthStart(year, month);
  const startOffset = getISOWeekDay(monthStart); // 0=Mon

  // Selected day events
  const selectedEvents = selectedDay ? (eventsByDay.get(selectedDay) ?? []) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Calendario</h1>
          <p className="text-muted-foreground">Citas y tareas del mes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>Hoy</Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-base font-semibold w-40 text-center">{MONTHS_ES[month]} {year}</span>
            <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Calendar grid */}
        <Card>
          <CardContent className="p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS_ES.map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {/* Empty cells before month start */}
              {Array.from({ length: startOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-background min-h-[80px] p-1.5" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
                const isSelected = day === selectedDay;
                const events = eventsByDay.get(day) ?? [];
                const apptCount = events.filter(e => e.type === "appointment").length;
                const taskCount = events.filter(e => e.type === "task").length;
                const hasOverdue = events.some(e => e.isOverdue);

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`bg-background min-h-[80px] p-1.5 text-left transition-colors hover:bg-accent/50 relative
                      ${isSelected ? "ring-2 ring-primary ring-inset" : ""}
                    `}
                  >
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium
                      ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}
                    `}>
                      {day}
                    </span>

                    {/* Event dots */}
                    <div className="mt-1 space-y-0.5">
                      {apptCount > 0 && (
                        <div className="flex items-center gap-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                          <span className="text-[10px] text-blue-600 leading-none truncate">
                            {apptCount === 1 ? "1 cita" : `${apptCount} citas`}
                          </span>
                        </div>
                      )}
                      {taskCount > 0 && (
                        <div className="flex items-center gap-0.5">
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${hasOverdue ? "bg-red-500" : "bg-green-500"}`} />
                          <span className={`text-[10px] leading-none truncate ${hasOverdue ? "text-red-600" : "text-muted-foreground"}`}>
                            {taskCount === 1 ? "1 tarea" : `${taskCount} tareas`}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Fill remaining cells to complete the grid */}
              {(() => {
                const total = startOffset + daysInMonth;
                const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
                return Array.from({ length: remaining }).map((_, i) => (
                  <div key={`end-${i}`} className="bg-background min-h-[80px] p-1.5 opacity-30" />
                ));
              })()}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />Citas</div>
              <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" />Tareas</div>
              <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />Vencidas</div>
            </div>
          </CardContent>
        </Card>

        {/* Day detail panel */}
        <div className="space-y-3">
          <Card>
            <CardContent className="p-4">
              {selectedDay === null ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Selecciona un día para ver sus eventos
                </div>
              ) : (
                <>
                  <h3 className="font-semibold mb-3">
                    {selectedDay} de {MONTHS_ES[month]}
                  </h3>
                  {selectedEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin eventos para este día.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedEvents.map(ev => {
                        if (ev.type === "appointment") {
                          return (
                            <div key={ev.id} className="flex items-start gap-2 p-2 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
                              <Clock className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{ev.title}</p>
                                {ev.time && <p className="text-xs text-blue-500">{ev.time}</p>}
                                {ev.rawAppt?.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{ev.rawAppt.notes}</p>}
                              </div>
                            </div>
                          );
                        }
                        // task
                        const task = ev.rawTask!;
                        return (
                          <div key={ev.id} className={`flex items-start gap-2 p-2 rounded-md border ${ev.isDone ? "opacity-50 bg-muted/30 border-border" : ev.isOverdue ? "bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900" : "bg-card border-border"}`}>
                            <CheckSquare className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${ev.isDone ? "text-green-500" : ev.isOverdue ? "text-red-500" : "text-muted-foreground"}`} />
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm font-medium ${ev.isDone ? "line-through text-muted-foreground" : ""}`}>{ev.title}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_COLORS[ev.priority ?? "medium"]}`} />
                                <span className="text-xs text-muted-foreground capitalize">{ev.priority}</span>
                                {ev.isOverdue && <Badge variant="destructive" className="text-[10px] px-1 py-0">Vencida</Badge>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick links */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Accesos rápidos</p>
              <Link href="/tasks" className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                <CheckSquare className="h-3.5 w-3.5" />Ver todas las tareas
              </Link>
              {loading && <p className="text-xs text-muted-foreground">Cargando...</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
