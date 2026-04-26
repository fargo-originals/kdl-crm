"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ExternalLink, Loader2, Mail, Calendar, MessageSquare, Video } from "lucide-react";

interface Integration {
  id: string;
  type: string;
  is_active: boolean;
  created_at: string;
}

const INTEGRATIONS = [
  {
    id: "google_gmail",
    name: "Gmail",
    description: "Sincroniza emails con contactos y deals. Ve el historial de conversaciones directamente en el CRM.",
    icon: Mail,
    color: "text-red-500",
    category: "Google Workspace",
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Crea y gestiona reuniones desde el CRM. Sincroniza eventos con contactos y deals.",
    icon: Calendar,
    color: "text-blue-500",
    category: "Google Workspace",
  },
  {
    id: "microsoft_outlook",
    name: "Outlook",
    description: "Conecta tu email de Microsoft para registrar comunicaciones automáticamente.",
    icon: Mail,
    color: "text-blue-600",
    category: "Microsoft 365",
  },
  {
    id: "microsoft_teams",
    name: "Microsoft Teams",
    description: "Crea reuniones de Teams desde deals y recibe notificaciones en canales de Teams.",
    icon: Video,
    color: "text-purple-500",
    category: "Microsoft 365",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Recibe notificaciones de nuevos deals, tickets y tareas directamente en Slack.",
    icon: MessageSquare,
    color: "text-green-500",
    category: "Comunicación",
  },
];

export default function IntegrationsPage() {
  const [connected, setConnected] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/integrations")
      .then((r) => r.json())
      .then((data) => { setConnected(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function isConnected(type: string) {
    return connected.some((c) => c.type === type && c.is_active);
  }

  async function disconnect(type: string) {
    setConnecting(type);
    await fetch(`/api/integrations/${type}`, { method: "DELETE" });
    setConnected((prev) => prev.filter((c) => c.type !== type));
    setConnecting(null);
  }

  function connect(type: string) {
    setConnecting(type);
    window.location.href = `/api/integrations/${type}/auth`;
  }

  const categories = [...new Set(INTEGRATIONS.map((i) => i.category))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integraciones</h1>
        <p className="text-muted-foreground">Conecta servicios externos para centralizar tu flujo de trabajo</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        categories.map((category) => (
          <div key={category}>
            <h2 className="text-lg font-semibold mb-3">{category}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {INTEGRATIONS.filter((i) => i.category === category).map((integration) => {
                const Icon = integration.icon;
                const active = isConnected(integration.id);
                return (
                  <Card key={integration.id} className={active ? "border-green-200 bg-green-50/30 dark:bg-green-950/10" : ""}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
                            <Icon className={`h-5 w-5 ${integration.color}`} />
                          </div>
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              {integration.name}
                              {active && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                            </CardTitle>
                          </div>
                        </div>
                        <Badge variant={active ? "default" : "secondary"} className={active ? "bg-green-100 text-green-700 border-green-200" : ""}>
                          {active ? "Conectado" : "Desconectado"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <CardDescription>{integration.description}</CardDescription>
                      <div className="flex gap-2">
                        {active ? (
                          <Button variant="outline" size="sm" onClick={() => disconnect(integration.id)} disabled={connecting === integration.id}>
                            {connecting === integration.id ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                            Desconectar
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => connect(integration.id)} disabled={connecting === integration.id}>
                            {connecting === integration.id ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                            Conectar
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-muted-foreground gap-1">
                          <ExternalLink className="h-3 w-3" />
                          Más info
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}

      <Card className="border-dashed">
        <CardContent className="py-6 text-center text-muted-foreground">
          <p className="text-sm">¿Necesitas una integración que no está aquí? <a href="mailto:support@kdl.com" className="text-primary underline">Contáctanos</a></p>
        </CardContent>
      </Card>
    </div>
  );
}
