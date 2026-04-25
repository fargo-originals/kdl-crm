"use client";

import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Settings, User, Users, GitBranch, Plug, Database, Bell, Shield } from "lucide-react";

const settingsSections = [
  { name: "Perfil", icon: User, href: "/settings/profile", description: "Gestiona tu información personal" },
  { name: "Equipo", icon: Users, href: "/settings/team", description: "Administra usuarios y roles" },
  { name: "Pipeline", icon: GitBranch, href: "/settings/pipeline", description: "Configura las etapas del pipeline" },
  { name: "Integraciones", icon: Plug, href: "/settings/integrations", description: "Conecta servicios externos" },
  { name: "Importar Datos", icon: Database, href: "/settings/import", description: "Importa contactos desde CSV/Excel" },
  { name: "Notificaciones", icon: Bell, href: "/settings/notifications", description: "Configura tus alertas" },
  { name: "Seguridad", icon: Shield, href: "/settings/security", description: "Configuración de seguridad" },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuración</h1>
          <p className="text-muted-foreground">Personaliza tu experiencia en KDL CRM</p>
        </div>
        <UserButton />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsSections.map((section) => (
          <Card key={section.name} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <section.icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{section.name}</CardTitle>
              </div>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Información de la cuenta</CardTitle>
          <CardDescription>Detalles de tu suscripción y uso</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input value="tuemail@tuempresa.es" disabled />
            </div>
            <div>
              <label className="text-sm font-medium">Plan</label>
              <Input value="Pro" disabled />
            </div>
          </div>
          <Button variant="outline">Gestionar suscripción</Button>
        </CardContent>
      </Card>
    </div>
  );
}