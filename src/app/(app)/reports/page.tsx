import { getSession } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { BarChart2, TrendingUp, Users, Mail, Download } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

function formatEur(v: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(v);
}

function pct(n: number) { return `${n}%`; }

function Bar({ value, max, color = 'bg-primary' }: { value: number; max: number; color?: string }) {
  const w = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${w}%` }} />
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Nuevo', contacted: 'Contactado', qualified: 'Cualificado',
  scheduled: 'Reunión', won: 'Ganado', lost: 'Perdido',
};
const STATUS_COLORS: Record<string, string> = {
  new: 'bg-slate-400', contacted: 'bg-blue-500', qualified: 'bg-violet-500',
  scheduled: 'bg-amber-500', won: 'bg-green-500', lost: 'bg-red-500',
};

// ── data fetching ─────────────────────────────────────────────────────────────

async function getData(userId: string, role: string) {
  const supabase = getSupabaseServer();
  const scoped = role === 'seller';

  const [stagesRes, dealsRes, leadsRes, campaignsRes] = await Promise.all([
    supabase.from('pipeline_stages').select('name, color, position, is_won, is_lost').order('position'),
    scoped
      ? supabase.from('deals').select('stage, value, probability, expected_close_date').eq('owner_id', userId)
      : supabase.from('deals').select('stage, value, probability, expected_close_date'),
    scoped
      ? supabase.from('lead_inquiries').select('status, created_at').eq('assigned_to', userId)
      : supabase.from('lead_inquiries').select('status, created_at'),
    scoped
      ? supabase.from('email_campaigns').select('id, name, status, sector, sent_count, opened_count, clicked_count, bounced_count, sent_at, created_at').eq('user_id', userId).order('created_at', { ascending: false })
      : supabase.from('email_campaigns').select('id, name, status, sector, sent_count, opened_count, clicked_count, bounced_count, sent_at, created_at').order('created_at', { ascending: false }),
  ]);

  const stages = stagesRes.data ?? [];
  const deals = dealsRes.data ?? [];
  const leads = leadsRes.data ?? [];
  const campaigns = campaignsRes.data ?? [];

  // ── Pipeline ──────────────────────────────────────────────────────────────
  const wonStages = new Set(stages.filter(s => s.is_won).map(s => s.name));
  const lostStages = new Set(stages.filter(s => s.is_lost).map(s => s.name));

  const pipelineByStage = stages.map(stage => {
    const sd = deals.filter(d => d.stage === stage.name);
    const total = sd.reduce((s, d) => s + Number(d.value ?? 0), 0);
    const weighted = sd.reduce((s, d) => {
      const prob = wonStages.has(d.stage) ? 100 : Number(d.probability ?? 50);
      return s + Number(d.value ?? 0) * (prob / 100);
    }, 0);
    return { name: stage.name, color: stage.color, is_won: stage.is_won, is_lost: stage.is_lost, count: sd.length, total, weighted };
  });

  const activeValue = pipelineByStage.filter(s => !s.is_won && !s.is_lost).reduce((s, st) => s + st.total, 0);
  const wonValue = pipelineByStage.filter(s => s.is_won).reduce((s, st) => s + st.total, 0);
  const wonCount = pipelineByStage.filter(s => s.is_won).reduce((s, st) => s + st.count, 0);
  const lostCount = pipelineByStage.filter(s => s.is_lost).reduce((s, st) => s + st.count, 0);
  const winRate = wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0;

  // ── Forecast ─────────────────────────────────────────────────────────────
  const now = new Date();
  function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

  function forecastBucket(days: number) {
    const cutoff = addDays(now, days);
    const subset = deals.filter(d => d.expected_close_date && new Date(d.expected_close_date) <= cutoff && !lostStages.has(d.stage));
    return {
      count: subset.length,
      total: subset.reduce((s, d) => s + Number(d.value ?? 0), 0),
      weighted: subset.reduce((s, d) => {
        const prob = wonStages.has(d.stage) ? 100 : Number(d.probability ?? 50);
        return s + Number(d.value ?? 0) * (prob / 100);
      }, 0),
    };
  }

  // ── Leads ────────────────────────────────────────────────────────────────
  const statusOrder = ['new', 'contacted', 'qualified', 'scheduled', 'won', 'lost'] as const;
  const leadCounts: Record<string, number> = {};
  statusOrder.forEach(s => { leadCounts[s] = 0; });
  leads.forEach(l => { if (l.status in leadCounts) leadCounts[l.status]++; });

  const won = leadCounts['won'] ?? 0;
  const lost = leadCounts['lost'] ?? 0;
  const conversionRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

  // ── Campaigns ─────────────────────────────────────────────────────────────
  const enrichedCampaigns = campaigns.map(c => ({
    ...c,
    open_rate: c.sent_count > 0 ? Math.round((c.opened_count / c.sent_count) * 100) : 0,
    click_rate: c.sent_count > 0 ? Math.round((c.clicked_count / c.sent_count) * 100) : 0,
  }));

  const sent = campaigns.filter(c => c.status === 'sent');
  const avgOpen = sent.length > 0
    ? Math.round(sent.reduce((s, c) => s + (c.sent_count > 0 ? (c.opened_count / c.sent_count) * 100 : 0), 0) / sent.length)
    : 0;

  return {
    pipeline: { stages: pipelineByStage, activeValue, wonValue, winRate, totalDeals: deals.length },
    forecast: { d30: forecastBucket(30), d60: forecastBucket(60), d90: forecastBucket(90) },
    leads: { counts: leadCounts, statusOrder, total: leads.length, conversionRate, won, lost },
    campaigns: { list: enrichedCampaigns, avgOpen, totalSent: sent.reduce((s, c) => s + (c.sent_count ?? 0), 0) },
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const data = await getData(session.sub, session.role);
  const { pipeline, forecast, leads, campaigns } = data;

  const maxStageValue = Math.max(...pipeline.stages.map(s => s.total), 1);
  const maxLeadCount = Math.max(...Object.values(leads.counts), 1);

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold">Reportes</h1>
        <p className="text-muted-foreground">Análisis de rendimiento del pipeline, leads y campañas</p>
      </div>

      {/* ── 1. Pipeline ──────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" /> Pipeline de ventas
          </h2>
          <a
            href="/api/reports/pipeline/csv"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-md px-2.5 py-1.5"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </a>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Pipeline activo', value: formatEur(pipeline.activeValue) },
            { label: 'Cerrado ganado', value: formatEur(pipeline.wonValue) },
            { label: 'Total deals', value: String(pipeline.totalDeals) },
            { label: 'Win rate', value: pct(pipeline.winRate) },
          ].map(kpi => (
            <Card key={kpi.label}>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-xl font-bold mt-0.5">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {pipeline.stages.map(stage => (
                <div key={stage.name} className="px-4 py-3 flex items-center gap-4">
                  <div className="w-32 shrink-0">
                    <p className="text-sm font-medium truncate">{stage.name}</p>
                    <p className="text-xs text-muted-foreground">{stage.count} deal{stage.count !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex-1">
                    <Bar value={stage.total} max={maxStageValue} color={stage.is_won ? 'bg-green-500' : stage.is_lost ? 'bg-red-400' : 'bg-primary'} />
                  </div>
                  <div className="w-28 text-right">
                    <p className="text-sm font-semibold">{formatEur(stage.total)}</p>
                    <p className="text-xs text-muted-foreground">pond. {formatEur(stage.weighted)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── 2. Revenue Forecast ──────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" /> Revenue Forecast
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Próximos 30 días', data: forecast.d30 },
            { label: 'Próximos 60 días', data: forecast.d60 },
            { label: 'Próximos 90 días', data: forecast.d90 },
          ].map(({ label, data }) => (
            <Card key={label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-normal">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatEur(data.weighted)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">ponderado</p>
                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor total</span>
                    <span className="font-medium">{formatEur(data.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deals</span>
                    <span className="font-medium">{data.count}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── 3. Leads Funnel ──────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Funnel de Leads
          </h2>
          <a
            href="/api/reports/leads/csv"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-md px-2.5 py-1.5"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </a>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Total leads', value: String(leads.total) },
            { label: 'Ganados', value: String(leads.won) },
            { label: 'Tasa conversión', value: pct(leads.conversionRate) },
          ].map(kpi => (
            <Card key={kpi.label}>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-xl font-bold mt-0.5">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {leads.statusOrder.map(status => {
                const count = leads.counts[status] ?? 0;
                return (
                  <div key={status} className="px-4 py-3 flex items-center gap-4">
                    <div className="w-28 shrink-0 flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status] ?? 'bg-muted'}`} />
                      <span className="text-sm font-medium">{STATUS_LABELS[status] ?? status}</span>
                    </div>
                    <div className="flex-1">
                      <Bar value={count} max={maxLeadCount} color={STATUS_COLORS[status] ?? 'bg-muted'} />
                    </div>
                    <div className="w-20 text-right">
                      <span className="text-sm font-semibold">{count}</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({leads.total > 0 ? Math.round((count / leads.total) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── 4. Campañas ──────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> Rendimiento de Campañas
          </h2>
          <a
            href="/api/reports/campaigns/csv"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-md px-2.5 py-1.5"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </a>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Emails enviados', value: campaigns.totalSent.toLocaleString('es') },
            { label: 'Apertura media', value: pct(campaigns.avgOpen) },
            { label: 'Campañas totales', value: String(campaigns.list.length) },
          ].map(kpi => (
            <Card key={kpi.label}>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-xl font-bold mt-0.5">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            {campaigns.list.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No hay campañas todavía</p>
            ) : (
              <div className="divide-y">
                {/* Header */}
                <div className="px-4 py-2 grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground">
                  <span className="col-span-4">Campaña</span>
                  <span className="col-span-1 text-center">Estado</span>
                  <span className="col-span-2 text-right">Enviados</span>
                  <span className="col-span-2 text-right">Abiertos</span>
                  <span className="col-span-2 text-right">Clics</span>
                  <span className="col-span-1 text-right">Fecha</span>
                </div>
                {campaigns.list.map(c => (
                  <Link
                    key={c.id}
                    href={`/campaigns/${c.id}`}
                    className="px-4 py-3 grid grid-cols-12 gap-2 items-center hover:bg-muted/50 transition-colors"
                  >
                    <div className="col-span-4">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      {c.sector && <p className="text-xs text-muted-foreground">{c.sector}</p>}
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Badge variant={c.status === 'sent' ? 'success' : c.status === 'draft' ? 'secondary' : 'outline'} className="text-xs">
                        {c.status === 'sent' ? 'Enviada' : c.status === 'draft' ? 'Borrador' : c.status}
                      </Badge>
                    </div>
                    <span className="col-span-2 text-right text-sm">{c.sent_count ?? 0}</span>
                    <span className="col-span-2 text-right text-sm">
                      {c.opened_count ?? 0}
                      <span className="text-muted-foreground text-xs ml-1">({c.open_rate}%)</span>
                    </span>
                    <span className="col-span-2 text-right text-sm">
                      {c.clicked_count ?? 0}
                      <span className="text-muted-foreground text-xs ml-1">({c.click_rate}%)</span>
                    </span>
                    <span className="col-span-1 text-right text-xs text-muted-foreground">
                      {c.sent_at ? new Date(c.sent_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '—'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
