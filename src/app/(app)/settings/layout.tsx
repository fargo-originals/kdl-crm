import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { User, Users, GitBranch, Plug, Database, Bell, Shield } from "lucide-react";

const settingsNav = [
  { name: "Perfil", href: "/settings/profile", icon: User },
  { name: "Equipo", href: "/settings/team", icon: Users },
  { name: "Pipeline", href: "/settings/pipeline", icon: GitBranch },
  { name: "Integraciones", href: "/settings/integrations", icon: Plug },
  { name: "Importar Datos", href: "/settings/import", icon: Database },
  { name: "Notificaciones", href: "/settings/notifications", icon: Bell },
  { name: "Seguridad", href: "/settings/security", icon: Shield },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-6">
      <div className="w-64 shrink-0">
        <nav className="space-y-1">
          {settingsNav.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}