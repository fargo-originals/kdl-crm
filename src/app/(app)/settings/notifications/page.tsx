"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PREFS_KEY = "kdl_notification_prefs";

interface NotificationPrefs {
  new_contact: boolean;
  new_deal: boolean;
  deal_stage_change: boolean;
  deal_won: boolean;
  new_ticket: boolean;
  ticket_assigned: boolean;
  ticket_resolved: boolean;
  task_due: boolean;
  task_assigned: boolean;
  team_member_added: boolean;
  email_notifications: boolean;
  browser_notifications: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  new_contact: true,
  new_deal: true,
  deal_stage_change: true,
  deal_won: true,
  new_ticket: true,
  ticket_assigned: true,
  ticket_resolved: false,
  task_due: true,
  task_assigned: true,
  team_member_added: false,
  email_notifications: true,
  browser_notifications: false,
};

const SECTIONS = [
  {
    title: "Contactos y Empresas",
    items: [{ key: "new_contact", label: "Nuevo contacto creado", description: "Cuando se agrega un contacto al sistema" }],
  },
  {
    title: "Pipeline",
    items: [
      { key: "new_deal", label: "Nuevo deal creado", description: "Cuando se crea una nueva oportunidad" },
      { key: "deal_stage_change", label: "Cambio de etapa", description: "Cuando un deal avanza en el pipeline" },
      { key: "deal_won", label: "Deal ganado", description: "Cuando se cierra un deal como ganado" },
    ],
  },
  {
    title: "Tickets",
    items: [
      { key: "new_ticket", label: "Nuevo ticket", description: "Cuando se crea un ticket de soporte" },
      { key: "ticket_assigned", label: "Ticket asignado", description: "Cuando se te asigna un ticket" },
      { key: "ticket_resolved", label: "Ticket resuelto", description: "Cuando un ticket se marca como resuelto" },
    ],
  },
  {
    title: "Tareas",
    items: [
      { key: "task_due", label: "Tarea próxima a vencer", description: "Recordatorio 24h antes del vencimiento" },
      { key: "task_assigned", label: "Tarea asignada", description: "Cuando se te asigna una nueva tarea" },
    ],
  },
  {
    title: "Equipo",
    items: [{ key: "team_member_added", label: "Nuevo miembro del equipo", description: "Cuando alguien se une al CRM" }],
  },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${checked ? "bg-primary" : "bg-input"}`}
    >
      <span className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PREFS_KEY);
      if (stored) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
    } catch {}
  }, []);

  function update(key: keyof NotificationPrefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function requestBrowserPermission() {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    if (permission === "granted") update("browser_notifications", true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notificaciones</h1>
          <p className="text-muted-foreground">Configura cuándo y cómo recibir alertas</p>
        </div>
        {saved && <Badge variant="default" className="bg-green-500">Guardado</Badge>}
      </div>

      {/* Canales */}
      <Card>
        <CardHeader><CardTitle>Canales de notificación</CardTitle><CardDescription>Cómo quieres recibir las notificaciones</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email</p>
              <p className="text-sm text-muted-foreground">Recibe notificaciones en tu correo electrónico</p>
            </div>
            <Toggle checked={prefs.email_notifications} onChange={(v) => update("email_notifications", v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Notificaciones del navegador</p>
              <p className="text-sm text-muted-foreground">Alertas en tiempo real en tu escritorio</p>
            </div>
            <div className="flex items-center gap-2">
              {!prefs.browser_notifications && (
                <button onClick={requestBrowserPermission} className="text-xs text-primary underline">Activar</button>
              )}
              <Toggle checked={prefs.browser_notifications} onChange={(v) => update("browser_notifications", v)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Eventos */}
      {SECTIONS.map((section) => (
        <Card key={section.title}>
          <CardHeader><CardTitle>{section.title}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {section.items.map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <Toggle
                  checked={prefs[item.key as keyof NotificationPrefs] as boolean}
                  onChange={(v) => update(item.key as keyof NotificationPrefs, v)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
