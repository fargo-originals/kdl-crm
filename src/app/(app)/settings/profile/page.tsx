"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface SessionUser {
  sub: string;
  email: string;
  role: string;
}

export default function ProfileSettingsPage() {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(data => { if (!data.error) setUser(data); });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Perfil</h1>
          <p className="text-muted-foreground">Gestiona tu información personal</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Información del perfil</CardTitle>
          <CardDescription>Tu información de cuenta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input value={user?.email || ""} disabled />
          </div>
          <div>
            <label className="text-sm font-medium">Rol</label>
            <Input value={user?.role || ""} disabled />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
