"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users as UsersIcon, Loader2, Plus, Shield, Trash2 } from "lucide-react";

interface TeamUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  active: boolean;
  created_at: string;
}

interface Me {
  sub: string;
  role: string;
  email: string;
}

const ROLES = [
  { value: "owner",  label: "Propietario" },
  { value: "admin",  label: "Administrador" },
  { value: "seller", label: "Vendedor" },
  { value: "basic",  label: "Básico" },
];

const ROLE_LEVEL: Record<string, number> = { owner: 4, admin: 3, seller: 2, basic: 1 };

function canManage(actorRole: string, targetRole: string) {
  if (actorRole === "owner") return true;
  if (actorRole === "admin") return (ROLE_LEVEL[targetRole] ?? 0) < (ROLE_LEVEL["admin"]);
  return false;
}

function canAssignRole(actorRole: string, newRole: string) {
  if (actorRole === "owner") return true;
  if (actorRole === "admin") return (ROLE_LEVEL[newRole] ?? 0) < (ROLE_LEVEL["admin"]);
  return false;
}

const ROLE_BADGE: Record<string, string> = {
  owner:  "bg-purple-100 text-purple-700",
  admin:  "bg-blue-100 text-blue-700",
  seller: "bg-green-100 text-green-700",
  basic:  "bg-gray-100 text-gray-600",
};

export default function TeamSettingsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserFirstName, setNewUserFirstName] = useState("");
  const [newUserLastName, setNewUserLastName] = useState("");
  const [newUserRole, setNewUserRole] = useState("seller");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then(r => r.json()),
      fetch("/api/users").then(r => r.json()),
    ]).then(([meData, usersData]) => {
      setMe(meData);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setLoading(false);
    });
  }, []);

  async function loadUsers() {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
  }

  async function updateUser(userId: string, updates: Record<string, unknown>) {
    setUpdating(userId);
    setError(null);
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Error al actualizar");
    }
    await loadUsers();
    setUpdating(null);
  }

  async function deleteUser(userId: string) {
    if (!confirm("¿Eliminar este usuario del CRM? Esta acción no se puede deshacer.")) return;
    setUpdating(userId);
    setError(null);
    const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Error al eliminar");
    }
    await loadUsers();
    setUpdating(null);
  }

  async function addUser() {
    if (!newUserEmail) return;
    setAdding(true);
    setError(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newUserEmail,
        first_name: newUserFirstName || null,
        last_name: newUserLastName || null,
        role: newUserRole,
      }),
    });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Error al crear usuario");
    } else {
      setNewUserEmail(""); setNewUserFirstName(""); setNewUserLastName(""); setNewUserRole("seller");
      setShowAddForm(false);
    }
    await loadUsers();
    setAdding(false);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Equipo</h1><p className="text-muted-foreground">Administra usuarios y roles</p></div>
        <Card><CardContent className="py-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></CardContent></Card>
      </div>
    );
  }

  const isOwnerOrAdmin = me && (me.role === "owner" || me.role === "admin");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Equipo</h1><p className="text-muted-foreground">Administra usuarios y roles</p></div>
        {isOwnerOrAdmin && (
          <Button onClick={() => setShowAddForm(true)} className="gap-2"><Plus className="h-4 w-4" />Agregar usuario</Button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>
      )}

      {showAddForm && (
        <Card>
          <CardHeader><CardTitle>Agregar nuevo usuario</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><label className="text-sm font-medium">Email *</label><Input type="email" placeholder="email@ejemplo.com" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} /></div>
            <div className="grid gap-4 md:grid-cols-2">
              <div><label className="text-sm font-medium">Nombre</label><Input placeholder="Nombre" value={newUserFirstName} onChange={(e) => setNewUserFirstName(e.target.value)} /></div>
              <div><label className="text-sm font-medium">Apellido</label><Input placeholder="Apellido" value={newUserLastName} onChange={(e) => setNewUserLastName(e.target.value)} /></div>
            </div>
            <div>
              <label className="text-sm font-medium">Rol</label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {ROLES.filter(r => canAssignRole(me?.role ?? "", r.value)).map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
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
              <p>No hay usuarios todavía.</p>
            </div>
          ) : (
            <div className="divide-y">
              {users.map((user) => {
                const isMe = me?.sub === user.id;
                const canEdit = !isMe && canManage(me?.role ?? "", user.role);
                return (
                  <div key={user.id} className="flex items-center justify-between py-4 gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                        {user.first_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {[user.first_name, user.last_name].filter(Boolean).join(" ") || <span className="text-muted-foreground">Sin nombre</span>}
                          {isMe && <span className="ml-2 text-xs text-muted-foreground">(tú)</span>}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {canEdit ? (
                        <div className="flex items-center gap-1">
                          <Shield className="h-3 w-3 text-muted-foreground" />
                          <select
                            value={user.role}
                            onChange={(e) => updateUser(user.id, { role: e.target.value })}
                            disabled={updating === user.id}
                            className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {ROLES.filter(r => canAssignRole(me?.role ?? "", r.value)).map(r => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE[user.role] ?? "bg-gray-100 text-gray-600"}`}>
                          <Shield className="h-3 w-3" />
                          {ROLES.find(r => r.value === user.role)?.label ?? user.role}
                        </span>
                      )}

                      {canEdit && (
                        <Badge
                          variant={user.active ? "default" : "secondary"}
                          className="cursor-pointer select-none"
                          onClick={() => updateUser(user.id, { active: !user.active })}
                        >
                          {user.active ? "Activo" : "Inactivo"}
                        </Badge>
                      )}
                      {!canEdit && (
                        <Badge variant={user.active ? "default" : "secondary"}>
                          {user.active ? "Activo" : "Inactivo"}
                        </Badge>
                      )}

                      {canEdit && (
                        <Button
                          variant="ghost" size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteUser(user.id)}
                          disabled={updating === user.id}
                        >
                          {updating === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Niveles de acceso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {[
              { role: "owner",  label: "Propietario", desc: "Acceso total. Gestiona landing, equipo, configuración y todos los módulos." },
              { role: "admin",  label: "Administrador", desc: "Acceso a todos los módulos CRM. Puede gestionar vendedores y básicos. Sin acceso a landing." },
              { role: "seller", label: "Vendedor", desc: "Acceso a contactos, empresas, deals, tareas y prospección." },
              { role: "basic",  label: "Básico", desc: "Acceso de solo lectura a contactos, empresas y deals." },
            ].map(({ role, label, desc }) => (
              <div key={role} className="flex items-start gap-3">
                <span className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[role]}`}>{label}</span>
                <span className="text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
