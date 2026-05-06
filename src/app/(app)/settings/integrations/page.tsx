"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ExternalLink, Loader2, Mail, Calendar, MessageSquare, Video, AlertCircle, XCircle } from "lucide-react";

interface Integration {
  id: string;
  type: string;
  is_active: boolean;
}

interface Config {
  google: boolean;
  microsoft: boolean;
  slack: boolean;
}

const INTEGRATIONS = [
  {
    id: "google_gmail",
    name: "Gmail",
    description: "Sincroniza emails con contactos y deals. Ve el historial de conversaciones directamente en el CRM.",
    icon: Mail,
    color: "text-red-500",
    category: "Google Workspace",
    provider: "google",
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Crea y gestiona reuniones desde el CRM. Sincroniza eventos con contactos y deals.",
    icon: Calendar,
    color: "text-blue-500",
    category: "Google Workspace",
    provider: "google",
  },
  {
    id: "microsoft_outlook",
    name: "Outlook",
    description: "Conecta tu email de Microsoft para registrar comunicaciones automáticamente.",
    icon: Mail,
    color: "text-blue-600",
    category: "Microsoft 365",
    provider: "microsoft",
  },
  {
    id: "microsoft_teams",
    name: "Microsoft Teams",
    description: "Crea reuniones de Teams desde deals y recibe notificaciones en canales de Teams.",
    icon: Video,
    color: "text-purple-500",
    category: "Microsoft 365",
    provider: "microsoft",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Recibe notificaciones de nuevos deals, tickets y tareas directamente en Slack.",
    icon: MessageSquare,
    color: "text-green-500",
    category: "Comunicación",
    provider: "slack",
  },
];

const ERROR_MESSAGES: Record<string, string> = {
  oauth_failed: "El proceso de autenticación fue cancelado o falló.",
  token_failed: "No se pudo obtener el token de acceso. Inténtalo de nuevo.",
  callback_error: "Error durante el proceso de conexión.",
  missing_google_config: "Google OAuth no está configurado en el servidor.",
  missing_microsoft_config: "Microsoft OAuth no está configurado en el servidor.",
  missing_slack_config: "Slack OAuth no está configurado en el servidor.",
};

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const [connected, setConnected] = useState<Integration[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  const errorKey = searchParams.get("error");
  const success = searchParams.get("success");

  useEffect(() => {
    Promise.all([
      fetch("/api/integrations").then(r => r.json()),
      fetch("/api/integrations/config").then(r => r.json()),
    ]).then(([intData, cfgData]) => {
      setConnected(Array.isArray(intData) ? intData : []);
      setConfig(cfgData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function isConnected(type: string) {
    return connected.some((c) => c.type === type && c.is_active);
  }

  function isConfigured(provider: string) {
    if (!config) return true; // optimistic while loading
    return config[provider as keyof Config] ?? false;
  }

  async function disconnect(type: string) {
    setConnecting(type);
    await fetch(`/api/integrations/${type}`, { method: "DELETE" });
    setConnected(prev => prev.filter(c => c.type !== type));
    setConnecting(null);
  }

  function connect(type: string) {
    setConnecting(type);
    window.location.href = `/api/integrations/${type}/auth`;
  }

  const categories = [...new Set(INTEGRATIONS.map(i => i.category))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integraciones</h1>
        <p className="text-muted-foreground">Conecta servicios externos para centralizar tu flujo de trabajo</p>
      </div>

      {errorKey && (
        <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{ERROR_MESSAGES[errorKey] ?? "Error desconocido al conectar la integración."}</span>
        </div>
      )}

      {success === "connected" && (
        <div className="flex items-center gap-3 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Integración conectada correctamente.</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        categories.map(category => (
          <div key={category}>
            <h2 className="text-lg font-semibold mb-3">{category}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {INTEGRATIONS.filter(i => i.category === category).map(integration => {
                const Icon = integration.icon;
                const active = isConnected(integration.id);
                const configured = isConfigured(integration.provider);
                return (
                  <Card key={integration.id} className={active ? "border-green-200 bg-green-50/30 dark:bg-green-950/10" : ""}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
                            <Icon className={`h-5 w-5 ${integration.color}`} />
                          </div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {integration.name}
                            {active && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          </CardTitle>
                        </div>
                        <Badge
                          variant={active ? "default" : "secondary"}
                          className={active ? "bg-green-100 text-green-700 border-green-200" : ""}
                        >
                          {active ? "Conectado" : "Desconectado"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <CardDescription>{integration.description}</CardDescription>

                      {!configured && (
                        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          Credenciales OAuth no configuradas en el servidor.
                        </div>
                      )}

                      <div className="flex gap-2">
                        {active ? (
                          <Button variant="outline" size="sm" onClick={() => disconnect(integration.id)} disabled={connecting === integration.id}>
                            {connecting === integration.id && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                            Desconectar
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => connect(integration.id)} disabled={connecting === integration.id || !configured}>
                            {connecting === integration.id && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
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
