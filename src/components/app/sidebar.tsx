import Link from "next/link";
import { Users, Building2, DollarSign, Ticket, CheckSquare, Settings, Radar, Upload } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Users },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Contactos", href: "/contacts", icon: Users },
  { name: "Empresas", href: "/companies", icon: Building2 },
  { name: "Pipeline", href: "/deals", icon: DollarSign },
  { name: "Prospeccion", href: "/prospecting", icon: Radar },
  { name: "Importar Apify", href: "/prospecting/import", icon: Upload },
  { name: "Tickets", href: "/tickets", icon: Ticket },
  { name: "Tareas", href: "/tasks", icon: CheckSquare },
  { name: "Configuración", href: "/settings", icon: Settings },
];

export function Sidebar() {
  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="text-xl font-bold text-primary">
          KDL CRM
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => (
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
  );
}
