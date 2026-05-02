'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

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

const STATUSES = ['new', 'contacted', 'qualified', 'scheduled', 'won', 'lost'];

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/leads/${id}`).then(r => r.json()).then(setLead);
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

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{lead.full_name}</h1>
          <p className="text-muted-foreground">{lead.email} · {new Date(lead.created_at).toLocaleDateString('es')}</p>
        </div>
        <button onClick={() => router.back()} className="rounded-md border px-4 py-2 text-sm hover:bg-accent">
          ← Volver
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <h2 className="font-semibold">Información</h2>
          {lead.phone && <p className="text-sm"><span className="text-muted-foreground">Teléfono:</span> {lead.phone}</p>}
          {lead.business_name && <p className="text-sm"><span className="text-muted-foreground">Empresa:</span> {lead.business_name}</p>}
          {lead.business_type && <p className="text-sm"><span className="text-muted-foreground">Sector:</span> {lead.business_type}</p>}
          {lead.service_interest && <p className="text-sm"><span className="text-muted-foreground">Servicio:</span> {lead.service_interest}</p>}
          {lead.budget_range && <p className="text-sm"><span className="text-muted-foreground">Presupuesto:</span> {lead.budget_range}</p>}
          {lead.preferred_time_window && <p className="text-sm"><span className="text-muted-foreground">Horario:</span> {lead.preferred_time_window}</p>}
          <p className="text-sm"><span className="text-muted-foreground">Canal:</span> {lead.preferred_channel}</p>
          <p className="text-sm"><span className="text-muted-foreground">Idioma:</span> {lead.locale}</p>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-2">
          <h2 className="font-semibold">Gestión</h2>
          <p className="text-sm">
            <span className="text-muted-foreground">Asignado a:</span>{' '}
            {lead.assigned_user ? `${lead.assigned_user.first_name} ${lead.assigned_user.last_name}` : 'Sin asignar'}
          </p>
          <button onClick={assignSelf} className="text-sm text-primary hover:underline">
            Asignarme este lead
          </button>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Estado:</p>
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

      {lead.message && (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="font-semibold mb-2">Mensaje</h2>
          <p className="text-sm whitespace-pre-wrap">{lead.message}</p>
        </div>
      )}
    </div>
  );
}
