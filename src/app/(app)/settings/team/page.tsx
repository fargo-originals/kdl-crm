"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users as UsersIcon, Loader2, Plus, Shield } from "lucide-react";

interface TeamUser {
  id: string;
  clerk_id?: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  active: boolean;
  created_at: string;
}

const roles = [
  { value: "owner", label: "Propietario" },
  { value: "admin", label: "Administrador" },
  { value: "seller", label: "Vendedor" },
  { value: "support", label: "Soporte" },
  { value: "viewer", label: "Solo lectura" },
];

export default function TeamSettingsPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserFirstName, setNewUserFirstName] = useState("");
  const [newUserLastName, setNewUserLastName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data || []);
    setLoading(false);
  }

  async function updateUser(userId: string, updates: Partial<TeamUser>) {
    setUpdating(userId);
    await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    await loadUsers();
    setUpdating(null);
  }

  async function addUser() {
    if (!newUserEmail) return;
    setAdding(true);

    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newUserEmail,
        first_name: newUserFirstName || null,
        last_name: newUserLastName || null,
        role: "seller",
      }),
    });

    setNewUserEmail("");
    setNewUserFirstName("");
    setNewUserLastName("");
    setShowAddForm(false);
    await loadUsers();
    setAdding(false);
  }

  if (!isLoaded || loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Equipo</h1>
          <p className="text-muted-foreground">Administra usuarios y roles</p>
        </div>
        <Card>
          <CardContent className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-muted-foreground mt-2">Cargando...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Equipo</h1>
          <p className="text-muted-foreground">Administra usuarios y roles</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Agregar usuario
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Agregar nuevo usuario</CardTitle>
            <CardDescription>
              El usuario se añadirá como Vendedor por defecto.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email *</label>
              <Input
                type="email"
                placeholder="email@ejemplo.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  placeholder="Nombre"
                  value={newUserFirstName}
                  onChange={(e) => setNewUserFirstName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Apellido</label>
                <Input
                  placeholder="Apellido"
                  value={newUserLastName}
                  onChange={(e) => setNewUserLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={addUser} disabled={adding || !newUserEmail}>
                {adding ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Agregando...</> : "Agregar usuario"}
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Usuarios del equipo ({users.length})</CardTitle>
          <CardDescription>Usuarios registrados en el CRM</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2 text-muted-foreground">
              <UsersIcon className="h-12 w-12" />
              <p>No hay usuarios en el equipo todavía.</p>
              <p className="text-sm">Los usuarios se crean automáticamente al iniciar sesión.</p>
            </div>
          ) : (
            <div className="divide-y">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      {user.first_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">
                        {user.first_name} {user.last_name}
                        {!user.first_name && !user.last_name && <span className="text-muted-foreground">Sin nombre</span>}
                        {user.clerk_id === clerkUser?.id && (
                          <span className="ml-2 text-xs text-muted-foreground">(tú)</span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {editingRole === user.id ? (
                      <select
                        value={user.role}
                        onChange={(e) => { updateUser(user.id, { role: e.target.value }); setEditingRole(null); }}
                        onBlur={() => setEditingRole(null)}
                        autoFocus
                        disabled={user.role === "owner"}
                        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {roles.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingRole(user.id)}
                        disabled={user.role === "owner" || updating === user.id}
                      >
                        <Shield className="mr-1 h-3 w-3" />
                        {roles.find((r) => r.value === user.role)?.label || user.role}
                      </Button>
                    )}
                    <Badge variant={user.active ? "default" : "secondary"}>
                      {user.active ? "Activo" : "Inactivo"}
                    </Badge>
                    {user.role !== "owner" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateUser(user.id, { active: !user.active })}
                        disabled={updating === user.id}
                      >
                        {user.active ? "Desactivar" : "Activar"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información</CardTitle>
          <CardDescription>
            Los usuarios se crean automáticamente cuando inician sesión en el CRM.
            El primer usuario recibe el rol de Propietario; los siguientes son Vendedores por defecto.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
