import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSupabaseServer } from "@/lib/supabase-server";
import { getSession } from "@/lib/auth/session";
import { Users, Building2, DollarSign, Ticket, TrendingUp, Clock } from "lucide-react";

async function getStats() {
  const supabase = getSupabaseServer();

  const [contactsCount, companiesCount, dealsCount, ticketsCount] = await Promise.all([
    supabase.from("contacts").select("*", { count: "exact", head: true }),
    supabase.from("companies").select("*", { count: "exact", head: true }),
    supabase.from("deals").select("*", { count: "exact", head: true }),
    supabase.from("tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
  ]);

  return {
    contacts: contactsCount.count || 0,
    companies: companiesCount.count || 0,
    deals: dealsCount.count || 0,
    tickets: ticketsCount.count || 0,
  };
}

async function getRecentActivities() {
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from("activities")
    .select("*, user:users(first_name, last_name)")
    .order("created_at", { ascending: false })
    .limit(5);
  return data || [];
}

async function getPipelineData() {
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from("deals")
    .select("stage, value")
    .order("created_at", { ascending: false });

  const stages = ["New", "Qualified", "Meeting", "Proposal", "Negotiation", "Closed Won"];
  const result = stages.map((stage) => ({
    stage,
    count: 0,
    value: 0,
  }));

  data?.forEach((deal) => {
    const idx = stages.indexOf(deal.stage);
    if (idx >= 0) {
      result[idx].count++;
      result[idx].value += Number(deal.value) || 0;
    }
  });

  return result;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(value);
}

export default async function DashboardPage() {
  const session = await getSession();
  const stats = await getStats();
  const activities = await getRecentActivities();
  const pipeline = await getPipelineData();

  const statsData = [
    { title: "Contactos", value: stats.contacts.toString(), icon: Users, change: "0%" },
    { title: "Empresas", value: stats.companies.toString(), icon: Building2, change: "0%" },
    { title: "Deals Activos", value: stats.deals.toString(), icon: DollarSign, change: "0%" },
    { title: "Tickets Abiertos", value: stats.tickets.toString(), icon: Ticket, change: "0%" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Bienvenido, {session?.email}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-success" />
                {stat.change} vs mes anterior
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.length === 0 ? (
                <p className="text-muted-foreground text-sm">No hay actividad reciente</p>
              ) : (
                activities.map((activity: any) => (
                  <div key={activity.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium">{activity.subject}</p>
                      <p className="text-sm text-muted-foreground">{activity.type}</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(activity.created_at).toLocaleDateString("es-ES")}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado del Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pipeline.map((stage) => (
                <div key={stage.stage} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{stage.count}</Badge>
                    <span className="text-sm">{stage.stage}</span>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(stage.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
