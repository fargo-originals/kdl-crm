'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Mail, Phone, Clock } from 'lucide-react';

interface Lead {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  preferred_channel: string;
  status: string;
  created_at: string;
  assigned_user: { first_name: string; last_name: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  qualified: 'bg-purple-100 text-purple-800',
  scheduled: 'bg-green-100 text-green-800',
  won: 'bg-emerald-100 text-emerald-800',
  lost: 'bg-red-100 text-red-800',
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  whatsapp: <MessageCircle className="h-3 w-3" />,
  email: <Mail className="h-3 w-3" />,
  phone: <Phone className="h-3 w-3" />,
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    const res = await fetch(`/api/leads?${params}`);
    if (res.ok) {
      const data = await res.json();
      setLeads(data.leads);
      setTotal(data.total);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [status]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground">{total} leads en total</p>
        </div>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          {['new', 'contacted', 'qualified', 'scheduled', 'won', 'lost'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : (
        <div className="space-y-2">
          {leads.map(lead => (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className="flex items-center justify-between rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="space-y-1">
                <p className="font-medium">{lead.full_name}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {CHANNEL_ICONS[lead.preferred_channel]}
                  <span>{lead.email}</span>
                  {lead.business_name && <span>· {lead.business_name}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 text-right">
                <div className="text-sm text-muted-foreground">
                  {lead.assigned_user
                    ? `${lead.assigned_user.first_name} ${lead.assigned_user.last_name}`
                    : 'Sin asignar'}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[lead.status] ?? 'bg-gray-100'}`}>
                  {lead.status}
                </span>
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {new Date(lead.created_at).toLocaleDateString('es')}
                </span>
              </div>
            </Link>
          ))}
          {leads.length === 0 && (
            <p className="text-center py-12 text-muted-foreground">No hay leads que mostrar</p>
          )}
        </div>
      )}
    </div>
  );
}
