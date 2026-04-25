"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Calendar, User, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  reporter?: { first_name: string; last_name: string };
  company?: { name: string };
  created_at: string;
  resolved_at: string | null;
}

const statusColors: Record<string, "destructive" | "warning" | "secondary" | "success"> = {
  open: "destructive",
  in_progress: "warning",
  waiting: "secondary",
  resolved: "success",
};

const priorityLabels: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

const statusLabels: Record<string, string> = {
  open: "Abierto",
  in_progress: "En progreso",
  waiting: "Esperando",
  resolved: "Resuelto",
};

const statusIcons = {
  open: AlertCircle,
  in_progress: Clock,
  waiting: Clock,
  resolved: CheckCircle2,
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    setLoading(true);
    const { data, error } = await supabase
      .from("tickets")
      .select("*, reporter:users(first_name, last_name), company:companies(name)")
      .order("created_at", { ascending: false });

    if (data) setTickets(data);
    setLoading(false);
  }

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.company?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || t.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tickets</h1>
          <p className="text-muted-foreground">Gestiona las solicitudes de soporte</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo ticket
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {["all", "open", "in_progress", "resolved"].map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "Todos" : statusLabels[f as keyof typeof statusLabels]}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : filteredTickets.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">No hay tickets todavía</p>
          <Button onClick={loadTickets}>Recargar</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTickets.map((ticket) => {
            const StatusIcon = statusIcons[ticket.status as keyof typeof statusIcons] || AlertCircle;
            return (
              <Card key={ticket.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`h-4 w-4 ${ticket.status === "resolved" ? "text-success" : "text-muted-foreground"}`} />
                      <CardTitle className="text-base">#{ticket.id.slice(0, 8)}</CardTitle>
                    </div>
                    <Badge variant={statusColors[ticket.status as keyof typeof statusColors]}>
                      {statusLabels[ticket.status as keyof typeof statusLabels]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="font-medium mb-2">{ticket.title}</p>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary">{priorityLabels[ticket.priority] || ticket.priority}</Badge>
                    <Badge variant="outline">{ticket.category || "Sin categoría"}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {ticket.reporter?.first_name} {ticket.reporter?.last_name?.[0]}.
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(ticket.created_at).toLocaleDateString("es-ES")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}