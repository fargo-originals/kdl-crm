'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MessageCircle, Mail, Phone, Bot, User } from 'lucide-react';

interface Lead {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  business_type: string | null;
  service_interest: string | null;
  budget_range: string | null;
  message: string | null;
  preferred_channel: string;
  preferred_time_window: string | null;
  status: string;
  locale: string;
  qualification_data: Record<string, unknown>;
  created_at: string;
  assigned_user: { first_name: string; last_name: string; email: string } | null;
}

interface AgentMessage {
  role: 'assistant' | 'user';
  content: string;
  ts: string;
}

interface AgentSession {
  id: string;
  channel: 'whatsapp' | 'email';
  status: 'active' | 'awaiting_human' | 'closed';
  messages: AgentMessage[];
  created_at: string;
}

const STATUSES = ['new', 'contacted', 'qualified', 'scheduled', 'won', 'lost'];

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-purple-100 text-purple-700',
  scheduled: 'bg-orange-100 text-orange-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
};

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  whatsapp: <MessageCircle className="h-4 w-4 text-green-500" />,
  email: <Mail className="h-4 w-4 text-blue-500" />,
  phone: <Phone className="h-4 w-4 text-gray-500" />,
};

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/leads/${id}`).then(r => r.json()).then(setLead);
    fetch(`/api/agent-sessions?lead_id=${id}`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setSessions(data);
    });
  }, [id]);

  async function updateStatus(status: string) {
    setSaving(true);
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const updated = await fetch(`/api/leads/${id}`).then(r => r.json());
    setLead(updated);
    setSaving(false);
  }

  async function assignSelf() {
    const me = await fetch('/api/auth/me').then(r => r.json());
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to: me.sub }),
    });
    const updated = await fetch(`/api/leads/${id}`).then(r => r.json());
    setLead(updated);
  }

  if (!lead) return <p className="text-muted-foreground">Cargando...</p>;

  const allMessages = sessions.flatMap(s =>
    (s.messages as AgentMessage[]).map(m => ({ ...m, channel: s.channel, sessionStatus: s.status }))
  ).sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

  const qualKeys = Object.keys(lead.qualification_data ?? {});

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{lead.full_name}</h1>
          <p className="text-muted-foreground text-sm">
            {lead.email} · {new Date(lead.created_at).toLocaleDateString('es', { dateStyle: 'medium' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[lead.status] ?? 'bg-muted'}`}>
            {lead.status}
          </span>
          <button onClick={() => router.back()} className="rounded-md border px-4 py-2 text-sm hover:bg-accent">
            ← Volver
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Info */}
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <h2 className="font-semibold">Información del lead</h2>
          {lead.phone && <p className="text-sm"><span className="text-muted-foreground">Teléfono:</span> {lead.phone}</p>}
          {lead.business_name && <p className="text-sm"><span className="text-muted-foreground">Empresa:</span> {lead.business_name}</p>}
          {lead.business_type && <p className="text-sm"><span className="text-muted-foreground">Sector:</span> {lead.business_type}</p>}
          {lead.service_interest && <p className="text-sm"><span className="text-muted-foreground">Servicio:</span> {lead.service_interest}</p>}
          {lead.budget_range && <p className="text-sm"><span className="text-muted-foreground">Presupuesto:</span> {lead.budget_range}</p>}
          {lead.preferred_time_window && <p className="text-sm"><span className="text-muted-foreground">Horario preferido:</span> {lead.preferred_time_window}</p>}
          <p className="text-sm flex items-center gap-1">
            <span className="text-muted-foreground">Canal:</span>
            {CHANNEL_ICON[lead.preferred_channel]}
            {lead.preferred_channel}
          </p>
          <p className="text-sm"><span className="text-muted-foreground">Idioma:</span> {lead.locale}</p>
        </div>

        {/* Gestión */}
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="font-semibold">Gestión</h2>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Asignado a:</p>
            <p className="text-sm font-medium">
              {lead.assigned_user
                ? `${lead.assigned_user.first_name} ${lead.assigned_user.last_name}`
                : 'Sin asignar'}
            </p>
            <button onClick={assignSelf} className="text-xs text-primary hover:underline mt-1">
              Asignarme este lead
            </button>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Cambiar estado:</p>
            <div className="flex flex-wrap gap-1">
              {STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  disabled={saving || lead.status === s}
                  className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                    lead.status === s
                      ? 'bg-primary text-primary-foreground'
                      : 'border hover:bg-accent'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mensaje original */}
      {lead.message && (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="font-semibold mb-2">Mensaje inicial</h2>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{lead.message}</p>
        </div>
      )}

      {/* Datos de cualificación del agente */}
      {qualKeys.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="font-semibold mb-3">Datos cualificados por el agente</h2>
          <div className="grid grid-cols-2 gap-2">
            {qualKeys.map(key => (
              <div key={key} className="text-sm">
                <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                <span className="font-medium">{String(lead.qualification_data[key])}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conversación con el agente */}
      {allMessages.length > 0 ? (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Conversación con el agente IA
            {sessions[0] && (
              <span className={`ml-auto text-xs rounded-full px-2 py-0.5 font-medium ${
                sessions[0].status === 'active' ? 'bg-green-100 text-green-700' :
                sessions[0].status === 'awaiting_human' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {sessions[0].status === 'active' ? 'Activa' :
                 sessions[0].status === 'awaiting_human' ? 'Esperando comercial' : 'Cerrada'}
              </span>
            )}
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {allMessages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'assistant' ? '' : 'flex-row-reverse'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'assistant' ? 'bg-primary/10' : 'bg-muted'
                }`}>
                  {msg.role === 'assistant'
                    ? <Bot className="h-4 w-4 text-primary" />
                    : <User className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === 'assistant'
                    ? 'bg-primary/10 text-foreground rounded-tl-none'
                    : 'bg-muted rounded-tr-none'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(msg.ts).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
          <Bot className="h-8 w-8 mx-auto mb-2 opacity-30" />
          El agente IA aún no ha iniciado conversación con este lead.
        </div>
      )}
    </div>
  );
}
