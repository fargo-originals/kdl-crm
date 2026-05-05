"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Building2, DollarSign, Ticket,
  CheckSquare, Settings, Radar, LogOut, Inbox, Globe, Upload, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QueryProvider } from "@/components/app/query-provider";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Leads", href: "/leads", icon: Inbox },
  { name: "Contactos", href: "/contacts", icon: Users },
  { name: "Empresas", href: "/companies", icon: Building2 },
  { name: "Pipeline", href: "/deals", icon: DollarSign },
  { name: "Prospeccion", href: "/prospecting", icon: Radar },
  { name: "Importar Apify", href: "/prospecting/import", icon: Upload },
  { name: "Landing CMS", href: "/landing", icon: Globe },
  { name: "Tickets", href: "/tickets", icon: Ticket },
  { name: "Tareas", href: "/tasks", icon: CheckSquare },
  { name: "Configuración", href: "/settings", icon: Settings },
];

const PREFIX_ROUTES = ["/settings", "/prospecting", "/leads", "/landing"];

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {navigation.map((item) => {
        const isActive = PREFIX_ROUTES.includes(item.href)
          ? pathname.startsWith(item.href)
          : pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.name}
          </Link>
        );
      })}
    </>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <QueryProvider>
      <div className="flex h-screen">

        {/* ── Desktop sidebar ──────────────────────────────────── */}
        <div className="hidden md:flex h-full w-64 flex-col border-r bg-card">
          <div className="flex h-16 items-center border-b px-6">
            <Link href="/dashboard" className="text-xl font-bold text-primary">KDL CRM</Link>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            <NavLinks pathname={pathname} />
          </nav>
          <div className="border-t p-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* ── Mobile overlay ───────────────────────────────────── */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* ── Mobile drawer ────────────────────────────────────── */}
        <div className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-card border-r transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex h-16 items-center justify-between border-b px-6">
            <Link href="/dashboard" className="text-xl font-bold text-primary" onClick={() => setMobileOpen(false)}>
              KDL CRM
            </Link>
            <button onClick={() => setMobileOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </nav>
          <div className="border-t p-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* ── Main content ─────────────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden">

          {/* Mobile top bar */}
          <header className="flex h-14 items-center gap-4 border-b bg-card px-4 md:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/dashboard" className="text-lg font-bold text-primary">KDL CRM</Link>
          </header>

          <main className="flex-1 overflow-auto bg-background p-4 md:p-8">{children}</main>
        </div>
      </div>
    </QueryProvider>
  );
}
