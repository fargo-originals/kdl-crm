"use client";

import { useEffect, useState, use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, DollarSign, Calendar, User } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Deal {
  id: string;
  name: string;
  stage: string;
  value: number;
  probability: number;
  closed_at: string | null;
  created_at: string;
  company?: { name: string };
  owner?: { first_name: string; last_name: string };
}

const stages = [
  { id: "New", name: "New", color: "#64748B", position: 0 },
  { id: "Qualified", name: "Qualified", color: "#2563EB", position: 1 },
  { id: "Meeting", name: "Meeting", color: "#8B5CF6", position: 2 },
  { id: "Proposal", name: "Proposal", color: "#F59E0B", position: 3 },
  { id: "Negotiation", name: "Negotiation", color: "#F97316", position: 4 },
  { id: "Closed Won", name: "Closed Won", color: "#16A34A", position: 5 },
  { id: "Closed Lost", name: "Closed Lost", color: "#DC2626", position: 6 },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(value);
};

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeals();
  }, []);

  async function loadDeals() {
    setLoading(true);
    const { data, error } = await supabase
      .from("deals")
      .select("*, company:companies(name), owner:users(first_name, last_name)")
      .order("created_at", { ascending: false });

    if (data) setDeals(data);
    setLoading(false);
  }

  const getStageDeals = (stageId: string) => deals.filter((d) => d.stage === stageId);
  const getStageValue = (stageId: string) =>
    getStageDeals(stageId).reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  const getTotalValue = () => deals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground">Gestiona tus oportunidades de venta</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Valor total del pipeline</p>
            <p className="text-2xl font-bold">{formatCurrency(getTotalValue())}</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo deal
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : deals.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">No hay deals todavía</p>
          <Button onClick={loadDeals}>Recargar</Button>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <div key={stage.id} className="min-w-[280px] flex-1">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <CardTitle className="text-sm font-medium">
                        {stage.name}
                      </CardTitle>
                    </div>
                    <Badge variant="secondary">
                      {getStageDeals(stage.id).length}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(getStageValue(stage.id))}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {getStageDeals(stage.id).map((deal) => (
                    <Card
                      key={deal.id}
                      className="p-4 shadow-sm cursor-pointer hover:shadow-md"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h3 className="font-medium">
                            {deal.company?.name || "Sin empresa"}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {deal.probability}%
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {deal.name}
                        </p>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(Number(deal.value))}
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <User className="h-3 w-3" />
                            {deal.owner?.first_name} {deal.owner?.last_name?.[0]}.
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}