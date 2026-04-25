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

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  assignee?: { first_name: string; last_name: string };
  created_at: string;
}

const priorityColors: Record<string, "secondary" | "warning" | "destructive"> = {
  low: "secondary",
  medium: "warning",
  high: "destructive",
};

const statusIcons = {
  todo: Clock,
  in_progress: Clock,
  completed: CheckCircle2,
};

const statusLabels: Record<string, string> = {
  todo: "Pendiente",
  in_progress: "En progreso",
  completed: "Completada",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("*, assignee:users(first_name, last_name)")
      .order("created_at", { ascending: false });

    if (data) setTasks(data);
    setLoading(false);
  }

  const filteredTasks = tasks.filter(
    (t) => filter === "all" || t.status === filter
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tareas</h1>
          <p className="text-muted-foreground">Gestiona tus tareas y recordatorios</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva tarea
        </Button>
      </div>

      <div className="flex gap-2">
        {["all", "todo", "in_progress", "completed"].map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Todas" : f === "in_progress" ? "En progreso" : f === "completed" ? "Completadas" : "Pendientes"}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No hay tareas todavía</p>
              <Button onClick={loadTasks}>Recargar</Button>
            </div>
          ) : (
            <div className="divide-y">
              {filteredTasks.map((task) => {
                const StatusIcon = statusIcons[task.status as keyof typeof statusIcons] || Clock;
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between py-4 hover:bg-accent/50 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <StatusIcon className={`h-5 w-5 ${task.status === "completed" ? "text-success" : "text-muted-foreground"}`} />
                      <div>
                        <p className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <Badge variant={priorityColors[task.priority as keyof typeof priorityColors] || "secondary"}>
                            {task.priority}
                          </Badge>
                          {task.due_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(task.due_date).toLocaleDateString("es-ES")}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {task.assignee?.first_name} {task.assignee?.last_name?.[0]}.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}