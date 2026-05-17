import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSupabaseServer } from "@/lib/supabase-server";
import { getSession } from "@/lib/auth/session";
import {
  Users, Building2, DollarSign, Ticket, TrendingUp, Clock,
  Mail, Target, CalendarDays, Phone, CheckSquare, AlertCircle,
  Plus, Inbox, FileText,
} from "lucide-react";
import Link from "next/link";
import { waHref } from "@/lib/wa-link";

function hasGlobalAccess(role?: string) {
  return role === "owner" || role === "admin";
}

function formatEur(value: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(value);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

async function getData(session: Awaited<ReturnType<typeof getSession>>) {
  const supabase = getSupabaseServer();
  const scoped = !hasGlobalAccess(session?.role);
  const userId = session?.sub;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [
    contactsRes, companiesRes, dealsRes, ticketsRes,
    pipelineRes, stagesRes,
    leadsRes, campaignsRes, activitiesRes, appointmentsRes,
    overdueTasksRes, newLeadsRes, openTicketsRes,
  ] = await Promise.all([
    supabase.from("contacts").select("*", { count: "exact", head: true })
      .eq(scoped ? "owner_id" : "id", scoped ? userId! : "id"),
    supabase.from("companies").select("*", { count: "exact", head: true })
      .eq(scoped ? "owner_id" : "id", scoped ? userId! : "id"),
    supabase.from("deals").select("value, stage")
      .eq(scoped ? "owner_id" : "id", scoped ? userId! : "id"),
    supabase.from("tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("deals").select("stage, value")
      .eq(scoped ? "owner_id" : "id", scoped ? userId! : "id"),
    supabase.from("pipeline_stages").select("name, color, position, is_won, is_lost").order("position"),
    supabase.from("lead_inquiries").select("status, created_at")
      .gte("created_at", weekAgo.toISOString()),
    supabase.from("email_campaigns")
      .select("id, name, status, sent_count, opened_count, clicked_count, sent_at, created_at")
      .order("created_at", { ascending: false }).limit(3),
    supabase.from("activities")
      .select("id, subject, type, created_at, user:users(first_name, last_name)")
      .order("created_at", { ascending: false }).limit(5),
    supabase.from("appointments")
      .select("id, confirmed_slot, status, notes, lead:lead_inquiries(full_name, email, phone)")
      .eq("assigned_to", userId!)
      .neq("status", "cancelled")
      .gte("confirmed_slot", todayStart.toISOString())
      .lte("confirmed_slot", todayEnd.toISOString())
      .order("confirmed_slot", { ascending: true }),
    // Overdue tasks
    supabase.from("tasks")
      .select("id, title, priority, due_date")
      .or(`assignee_id.eq.${userId},created_by_id.eq.${userId}`)
      .lt("due_date", new Date().toISOString())
      .not("status", "in", '("done","completed","cancelled")')
      .order("due_date", { ascending: true })
      .limit(5),
    // New uncontacted leads (status = 'new', last 7 days)
    supabase.from("lead_inquiries")
      .select("*", { count: "exact", head: true })
      .eq("status", "new")
      .gte("created_at", weekAgo.toISOString()),
    // Open tickets count
    supabase.from("tickets")
      .select("*", { count: "exact", head: true })
      .in("status", ["open", "in_progress"]),
  ]);

  const deals = dealsRes.data ?? [];
  const pipelineDeals = pipelineRes.data ?? [];
  const stages = stagesRes.data ?? [];

  const pipelineTotal = deals
    .filter(d => !stages.find(s => s.name === d.stage)?.is_won && !stages.find(s => s.name === d.stage)?.is_lost)
    .reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  const leadsByStatus = (leadsRes.data ?? []).reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {});
  const leadsThisWeek = (leadsRes.data ?? []).length;

  const stageData = stages.map((s) => {
    const stageDeals = pipelineDeals.filter(d => d.stage === s.name);
    return {
      name: s.name,
      color: s.color ?? "#64748b",
      count: stageDeals.length,
      value: stageDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0),
      is_won: s.is_won,
      is_lost: s.is_lost,
    };
  });

  const leadStatuses = [
    { key: "new", label: "Nuevos", color: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" },
    { key: "contacted", label: "Contactados", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300" },
    { key: "qualified", label: "Cualificados", color: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300" },
    { key: "scheduled", label: "Agendados", color: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300" },
    { key: "won", label: "Ganados", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" },
    { key: "lost", label: "Perdidos", color: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300" },
  ];

  const won = leadsByStatus["won"] ?? 0;
  const lost = leadsByStatus["lost"] ?? 0;
  const conversionRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : null;

  return {
    contacts: contactsRes.count ?? 0,
    companies: companiesRes.count ?? 0,
    dealsCount: deals.length,
    ticketsOpen: ticketsRes.count ?? 0,
    pipelineTotal,
    leadsThisWeek,
    stageData,
    leadsByStatus,
    leadStatuses,
    conversionRate,
    campaigns: campaignsRes.data ?? [],
    activities: activitiesRes.data ?? [],
    appointments: appointmentsRes.data ?? [],
    overdueTasks: overdueTasksRes.data ?? [],
    newLeadsCount: newLeadsRes.count ?? 0,
    openTicketsCount: openTicketsRes.count ?? 0,
  };
}

export default async function DashboardPage() {
  const session = await getSession();
  const d = await getData(session);

  const firstName = session?.email?.split("@")[0] ?? "de nuevo";

  const kpis = [
    { title: "Contactos", value: d.contacts, icon: Users, href: "/contacts" },
    { title: "Empresas", value: d.companies, icon: Building2, href: "/companies" },
    { title: "Deals activos", value: d.dealsCount, icon: DollarSign, href: "/deals" },
    { title: "Tickets abiertos", value: d.ticketsOpen, icon: Ticket, href: "/tickets" },
    { title: "Pipeline total", value: formatEur(d.pipelineTotal), icon: TrendingUp, href: "/deals" },
    { title: "Leads esta semana", value: d.leadsThisWeek, icon: Target, href: "/leads" },
  ];

  // Attention items — only show if there's something to act on
  const attentionItems = [
    d.overdueTasks.length > 0 && {
      label: `${d.overdueTasks.length} tarea${d.overdueTasks.length !== 1 ? "s" : ""} vencida${d.overdueTasks.length !== 1 ? "s" : ""}`,
      href: "/tasks",
      color: "text-red-600 dark:text-red-400",
      icon: AlertCircle,
    },
    d.newLeadsCount > 0 && {
      label: `${d.newLeadsCount} lead${d.newLeadsCount !== 1 ? "s" : ""} sin contactar`,
      href: "/leads",
      color: "text-orange-600 dark:text-orange-400",
      icon: Inbox,
    },
    d.openTicketsCount > 0 && {
      label: `${d.openTicketsCount} ticket${d.openTicketsCount !== 1 ? "s" : ""} abierto${d.openTicketsCount !== 1 ? "s" : ""}`,
      href: "/tickets",
      color: "text-yellow-600 dark:text-yellow-400",
      icon: Ticket,
    },
  ].filter(Boolean) as { label: string; href: string; color: string; icon: typeof AlertCircle }[];

  const quickActions = [
    { label: "Nuevo lead", href: "/leads", icon: Inbox, description: "Registrar prospecto" },
    { label: "Nuevo deal", href: "/deals", icon: DollarSign, description: "Añadir al pipeline" },
    { label: "Nueva tarea", href: "/tasks", icon: CheckSquare, description: "Recordatorio" },
    { label: "Presupuesto", href: "/quotes/new", icon: FileText, description: "Crear oferta" },
  ];

  return (
    <div className="space-y-6">

      {/* Page title */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Hola, {firstName}. Aquí tienes el resumen de hoy.</p>
      </div>

      {/* ── 1. Barra de atención ─────────────────────────────── */}
      {attentionItems.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />
          <span className="text-sm font-medium text-orange-700 dark:text-orange-300 mr-1">Requiere atención:</span>
          {attentionItems.map((item, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-orange-300 dark:text-orange-700">·</span>}
              <Link
                href={item.href}
                className={`text-sm font-semibold hover:underline flex items-center gap-1 ${item.color}`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            </span>
          ))}
        </div>
      )}

      {/* ── 2. Agenda de hoy ─────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Agenda de hoy</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
            </span>
            <Link href="/calendar" className="text-xs text-primary hover:underline">Ver calendario →</Link>
          </div>
        </CardHeader>
        <CardContent>
          {d.appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin citas para hoy. ¡Buen momento para prospectar!</p>
          ) : (
            <div className="space-y-0 divide-y">
              {d.appointments.map((appt) => {
                const lead = appt.lead as { full_name?: string; email?: string; phone?: string } | null;
                const slotDate = new Date(appt.confirmed_slot);
                const time = slotDate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
                const waLink = waHref(lead?.phone ?? null);
                const isPast = slotDate < new Date();
                return (
                  <div key={appt.id} className="flex items-start gap-4 py-3">
                    <div className={`text-sm font-mono font-semibold shrink-0 w-12 pt-0.5 ${isPast ? "text-muted-foreground" : "text-primary"}`}>
                      {time}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isPast ? "text-muted-foreground" : ""}`}>
                        {lead?.full_name ?? "Visitante"}
                      </p>
                      {appt.notes && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{appt.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {lead?.phone && (
                        <a href={`tel:${lead.phone}`} className="text-muted-foreground hover:text-foreground" title={lead.phone}>
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {waLink && (
                        <a href={waLink} target="_blank" rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-green-600" title="WhatsApp">
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        </a>
                      )}
                      {isPast && <Badge variant="secondary" className="text-xs px-1.5 py-0">Pasada</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 3. KPI cards ─────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map((kpi) => (
          <Link key={kpi.title} href={kpi.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">{kpi.title}</CardTitle>
                <kpi.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{kpi.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* ── 4. Acciones rápidas ───────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickActions.map((action) => (
          <Link key={action.label} href={action.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full group">
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0">
                  <action.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
                <Plus className="h-4 w-4 text-muted-foreground ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* ── 5. Pipeline + Leads funnel ────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Pipeline</CardTitle>
            <Link href="/deals" className="text-xs text-primary hover:underline">Ver todos →</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {d.stageData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin etapas configuradas</p>
            ) : (
              d.stageData.map((stage) => (
                <div key={stage.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                      <span>{stage.name}</span>
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">{stage.count}</Badge>
                    </div>
                    <span className="text-muted-foreground font-medium">{formatEur(stage.value)}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round((stage.count / (d.stageData.reduce((s, st) => s + st.count, 0) || 1)) * 100)}%`,
                        backgroundColor: stage.color,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Leads esta semana</CardTitle>
              <div className="flex items-center gap-3">
                {d.conversionRate !== null && (
                  <span className="text-xs text-muted-foreground">
                    Conversión: <span className="font-medium text-foreground">{d.conversionRate}%</span>
                  </span>
                )}
                <Link href="/leads" className="text-xs text-primary hover:underline">Ver todos →</Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {d.leadStatuses.map((s) => (
                <div key={s.key} className={`rounded-md px-3 py-2 ${s.color}`}>
                  <p className="text-lg font-bold">{d.leadsByStatus[s.key] ?? 0}</p>
                  <p className="text-xs">{s.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 6. Últimas campañas + Actividad reciente ─────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Últimas campañas</CardTitle>
            <Link href="/campaigns" className="text-xs text-primary hover:underline">Ver todas →</Link>
          </CardHeader>
          <CardContent>
            {d.campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay campañas todavía</p>
            ) : (
              <div className="space-y-3">
                {d.campaigns.map((c) => {
                  const openRate = c.sent_count > 0 ? Math.round((c.opened_count / c.sent_count) * 100) : 0;
                  const clickRate = c.sent_count > 0 ? Math.round((c.clicked_count / c.sent_count) * 100) : 0;
                  return (
                    <Link key={c.id} href={`/campaigns/${c.id}`} className="flex items-center justify-between border-b pb-3 last:border-0 hover:opacity-80 transition-opacity block">
                      <div>
                        <p className="text-sm font-medium line-clamp-1">{c.name}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Mail className="h-3 w-3" />
                          <span>{c.sent_count} enviados</span>
                          {c.sent_count > 0 && (
                            <>
                              <span>·</span>
                              <span className="text-green-600 font-medium">{openRate}% abiertos</span>
                              {clickRate > 0 && <><span>·</span><span>{clickRate}% clics</span></>}
                            </>
                          )}
                        </div>
                      </div>
                      <Badge variant={c.status === "sent" ? "success" : c.status === "draft" ? "secondary" : "warning"} className="text-xs shrink-0">
                        {c.status}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Actividad reciente</CardTitle></CardHeader>
          <CardContent>
            {d.activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay actividad reciente</p>
            ) : (
              <div className="space-y-3">
                {d.activities.map((a) => {
                  const user = a.user as { first_name?: string; last_name?: string } | null;
                  return (
                    <div key={a.id} className="flex items-start justify-between gap-2 border-b pb-3 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{a.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.type}{user ? ` · ${user.first_name} ${user.last_name}` : ""}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                        <Clock className="h-3 w-3" />{formatDate(a.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
