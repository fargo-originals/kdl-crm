"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Plus, Trash2, GripVertical } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PipelineStage {
  id: string;
  name: string;
  position: number;
  color: string;
  probability_default: number;
  is_won: boolean;
  is_lost: boolean;
}

export default function PipelineSettingsPage() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStage, setNewStage] = useState("");
  const [colors] = useState(["#64748B", "#2563EB", "#8B5CF6", "#F59E0B", "#F97316", "#16A34A", "#DC2626"]);

  useEffect(() => {
    loadStages();
  }, []);

  async function loadStages() {
    setLoading(true);
    const { data } = await supabase
      .from("pipeline_stages")
      .select("*")
      .order("position");
    
    if (data) setStages(data);
    setLoading(false);
  }

  async function addStage() {
    if (!newStage.trim()) return;
    
    const position = stages.length;
    const color = colors[position % colors.length];
    
    const { error } = await supabase
      .from("pipeline_stages")
      .insert({
        name: newStage,
        position,
        color,
        probability_default: 50,
        is_won: false,
        is_lost: false,
      });
    
    if (!error) {
      setNewStage("");
      loadStages();
    }
  }

  async function deleteStage(id: string) {
    const { error } = await supabase
      .from("pipeline_stages")
      .delete()
      .eq("id", id);
    
    if (!error) {
      loadStages();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground">Configura las etapas del pipeline</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Etapas del pipeline</CardTitle>
          <CardDescription>Gestiona las etapas de tu embudo de ventas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input 
              placeholder="Nueva etapa..." 
              value={newStage}
              onChange={(e) => setNewStage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addStage()}
            />
            <Button onClick={addStage}>
              <Plus className="mr-2 h-4 w-4" />
              Añadir
            </Button>
          </div>

          {loading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : stages.length === 0 ? (
            <p className="text-muted-foreground">No hay etapas configuradas.</p>
          ) : (
            <div className="divide-y">
              {stages.map((stage) => (
                <div key={stage.id} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div 
                      className="h-4 w-4 rounded-full" 
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="font-medium">{stage.name}</span>
                    <Badge variant="secondary">{stage.probability_default}%</Badge>
                    {stage.is_won && <Badge variant="success">Ganado</Badge>}
                    {stage.is_lost && <Badge variant="destructive">Perdido</Badge>}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => deleteStage(stage.id)}
                    disabled={stage.is_won || stage.is_lost}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}