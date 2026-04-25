"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Users, GitBranch, Plug, Database, Bell, Shield } from "lucide-react";

const sections = [
  { name: "Perfil", href: "/settings/profile", icon: User, description: "Tu información personal" },
  { name: "Equipo", href: "/settings/team", icon: Users, description: "Usuarios y roles" },
  { name: "Pipeline", href: "/settings/pipeline", icon: GitBranch, description: "Etapas del embudo" },
  { name: "Integraciones", href: "/settings/integrations", icon: Plug, description: "Servicios externos" },
  { name: "Importar Datos", href: "/settings/import", icon: Database, description: "CSV/Excel" },
  { name: "Notificaciones", href: "/settings/notifications", icon: Bell, description: "Alertas" },
  { name: "Seguridad", href: "/settings/security", icon: Shield, description: "Seguridad" },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuración</h1>
          <p className="text-muted-foreground">Selecciona una opción</p>
        </div>
        <UserButton />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link key={section.name} href={section.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full min-h-[120px] flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <section.icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{section.name}</CardTitle>
                </div>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}