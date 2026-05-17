"use client";

import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Building2, DollarSign, Ticket,
  CheckSquare, Settings, Radar, LogOut, Inbox, Globe, Menu, X, Mail, MailOpen,
  CalendarDays, BarChart2, FileText,
} from "lucide-react";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { NotificationBell } from "@/components/app/notification-bell";
import { cn } from "@/lib/utils";
import { QueryProvider } from "@/components/app/query-provider";

// ── Navigation structure with groups ────────────────────────────
const NAV_GROUPS = [
  {
    label: "Principal",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
      { name: "Calendario", href: "/calendar", icon: CalendarDays, exact: true },
    ],
  },
  {
    label: "CRM",
    items: [
      { name: "Leads", href: "/leads", icon: Inbox },
      { name: "Contactos", href: "/contacts", icon: Users },
      { name: "Empresas", href: "/companies", icon: Building2 },
      { name: "Pipeline", href: "/deals", icon: DollarSign },
      { name: "Presupuestos", href: "/quotes", icon: FileText },
      { name: "Tareas", href: "/tasks", icon: CheckSquare, exact: true },
      { name: "Tickets", href: "/tickets", icon: Ticket },
    ],
  },
  {
    label: "Marketing",
    items: [
      { name: "Campañas", href: "/campaigns", icon: Mail },
      { name: "Bandeja", href: "/inbox", icon: MailOpen },
      { name: "Prospección", href: "/prospecting", icon: Radar },
      { name: "Landing CMS", href: "/landing", icon: Globe },
    ],
  },
  {
    label: "Análisis",
    items: [
      { name: "Reportes", href: "/reports", icon: BarChart2, exact: true },
    ],
  },
  {
    label: "Sistema",
    items: [
      { name: "Configuración", href: "/settings", icon: Settings },
    ],
  },
];

function isActive(href: string, pathname: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/") || pathname.startsWith(href);
}

function NavGroup({
  group,
  pathname,
  onNavigate,
}: {
  group: typeof NAV_GROUPS[0];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-0.5">
      <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
        {group.label}
      </p>
      {group.items.map((item) => {
        const active = isActive(item.href, pathname, item.exact);
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
            {item.name}
          </Link>
        );
      })}
    </div>
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="space-y-1">
      {NAV_GROUPS.map((group) => (
        <NavGroup key={group.label} group={group} pathname={pathname} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

function BookingButton() {
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/availability")
      .then(r => r.json())
      .then(d => setSlug(d.booking_slug ?? null))
      .catch(() => {});
  }, []);

  if (!slug) return null;

  return (
    <a
      href={`/book/${slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    >
      <CalendarDays className="h-4 w-4 shrink-0" />
      Mi página de reservas
    </a>
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

        {/* ── Desktop sidebar ───────────────────────────────── */}
        <div className="hidden md:flex h-full w-60 flex-col border-r bg-card">
          <div className="flex h-14 items-center border-b px-5">
            <Link href="/dashboard" className="text-lg font-bold text-primary tracking-tight">
              KDL CRM
            </Link>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-2">
            <NavLinks pathname={pathname} />
          </nav>
          <div className="border-t p-3 space-y-1">
            <div className="flex items-center gap-1 px-1">
              <ThemeToggle />
              <NotificationBell />
            </div>
            <BookingButton />
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* ── Mobile overlay ────────────────────────────────── */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* ── Mobile drawer ─────────────────────────────────── */}
        <div className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-card border-r transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex h-14 items-center justify-between border-b px-5">
            <Link href="/dashboard" className="text-lg font-bold text-primary" onClick={() => setMobileOpen(false)}>
              KDL CRM
            </Link>
            <button onClick={() => setMobileOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-2">
            <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </nav>
          <div className="border-t p-3 space-y-1">
            <div className="flex items-center gap-1 px-1">
              <ThemeToggle />
              <NotificationBell />
            </div>
            <BookingButton />
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* ── Main content ──────────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden">

          {/* Mobile top bar */}
          <header className="flex h-14 items-center gap-3 border-b bg-card px-4 md:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/dashboard" className="text-lg font-bold text-primary flex-1">KDL CRM</Link>
            <NotificationBell />
          </header>

          <main className="flex-1 overflow-auto bg-background p-4 pb-20 md:pb-8 md:p-8">
            {children}
          </main>
        </div>
      </div>

      {/* ── Mobile bottom navigation ──────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t bg-card md:hidden">
        {[
          { href: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
          { href: '/leads', icon: Inbox, label: 'Leads' },
          { href: '/deals', icon: DollarSign, label: 'Pipeline' },
          { href: '/tasks', icon: CheckSquare, label: 'Tareas' },
          { href: '/settings', icon: Settings, label: 'Config' },
        ].map(({ href, icon: Icon, label }) => {
          const active = isActive(href, pathname, href === '/dashboard' || href === '/tasks');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-1 rounded-md text-xs transition-colors',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </QueryProvider>
  );
}
