"use client";

import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users as UsersIcon, Trash2, Shield } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface TeamUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  active: boolean;
  created_at: string;
}

const roleColors: Record<string, "default" | "secondary" | "warning" | "destructive"> = {
  owner: "warning",
  admin: "default",
  seller: "secondary",
  support: "secondary",
  viewer: "secondary",
};

const roleLabels: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  seller: "Vendedor",
  support: "Soporte",
  viewer: "Solo lectura",
};

export default function TeamSettingsPage() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    const { data } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setUsers(data);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Equipo</h1>
          <p className="text-muted-foreground">Administra usuarios y roles</p>
        </div>
        <UserButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios del equipo</CardTitle>
          <CardDescription>Usuarios registrados en el CRM</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground">No hay usuarios todavía.</p>
          ) : (
            <div className="divide-y">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      {user.first_name?.[0] || user.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={roleColors[user.role] || "secondary"}>
                      <Shield className="mr-1 h-3 w-3" />
                      {roleLabels[user.role] || user.role}
                    </Badge>
                    <Badge variant={user.active ? "default" : "secondary"}>
                      {user.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}