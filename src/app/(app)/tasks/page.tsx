"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Calendar, User, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Task {
  id: string;
  title: string;
  description: string | null;
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

const priorityLabels: Record<string, string> = { low: "Baja", medium: "Media", high: "Alta" };
const statusLabels: Record<string, string> = { todo: "Pendiente", in_progress: "En progreso", completed: "Completada" };
const emptyForm = { title: "", description: "", priority: "medium", due_date: "" };

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { loadTasks(); }, []);

  async function loadTasks() {
    setLoading(true);
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function handleCreate() {
    if (!form.title) return;
    setSaving(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description || null,
        priority: form.priority,
        due_date: form.due_date || null,
        status: "todo",
      }),
    });
    if (res.ok) { setOpen(false); setForm(emptyForm); await loadTasks(); }
    setSaving(false);
  }

  async function toggleComplete(task: Task) {
    const newStatus = task.status === "completed" ? "todo" : "completed";
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t));
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, completed_at: newStatus === "completed" ? new Date().toISOString() : null }),
    });
  }

  const filteredTasks = tasks.filter((t) => filter === "all" || t.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tareas</h1>
          <p className="text-muted-foreground">Gestiona tus tareas y recordatorios</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nueva tarea</Button>
      </div>

      <div className="flex gap-2">
        {["all", "todo", "in_progress", "completed"].map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f === "all" ? "Todas" : statusLabels[f]}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No hay tareas todavía</p>
              <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Crear primera tarea</Button>
            </div>
          ) : (
            <div className="divide-y">
              {filteredTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-4 py-4 hover:bg-accent/30 rounded-md px-2 cursor-pointer">
                  <button
                    onClick={() => toggleComplete(task)}
                    className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {task.status === "completed"
                      ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                      : <Clock className="h-5 w-5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5 flex-wrap">
                      <Badge variant={priorityColors[task.priority] || "secondary"}>
                        {priorityLabels[task.priority] || task.priority}
                      </Badge>
                      {task.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(task.due_date).toLocaleDateString("es-ES")}
                        </span>
                      )}
                      {task.assignee && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {task.assignee.first_name} {task.assignee.last_name?.[0]}.
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">{task.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nueva tarea</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="task-title">Título *</Label>
              <Input id="task-title" placeholder="Ej: Llamar a cliente" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="task-desc">Descripción</Label>
              <Textarea id="task-desc" placeholder="Detalles de la tarea..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="task-priority">Prioridad</Label>
                <Select id="task-priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="task-due">Fecha límite</Label>
                <Input id="task-due" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving || !form.title}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : "Crear tarea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
