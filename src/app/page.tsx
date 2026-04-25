import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserButton } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, DollarSign, Ticket, BarChart3, Bell } from "lucide-react";

export default async function HomePage() {
  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold text-primary">
            KDL CRM
          </Link>
          <nav className="flex items-center gap-4">
            {userId ? (
              <>
                <Link href="/dashboard">
                  <Button variant="outline">Ir al Dashboard</Button>
                </Link>
                <UserButton afterSignOutUrl="/" />
              </>
            ) : (
              <>
                <Link href="/sign-in" className="text-sm font-medium text-muted-foreground hover:text-primary">
                  Iniciar sesión
                </Link>
                <Link href="/sign-up">
                  <Button>Empezar gratis</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <div className="container mx-auto px-4 py-16">
        <section className="mb-16 text-center">
          <h1 className="mb-4 text-4xl font-bold text-foreground">
            CRM Profesional para tu Equipo
          </h1>
          <p className="mb-8 text-xl text-muted-foreground">
            Gestiona tus relaciones con clientes de manera eficiente y profesional
          </p>
          <div className="flex justify-center gap-4">
            {userId ? (
              <Link href="/dashboard">
                <Button size="lg">Ir al Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/sign-up">
                  <Button size="lg">Empezar gratis</Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="outline" size="lg">
                    Ver demo
                  </Button>
                </Link>
              </>
            )}
          </div>
        </section>
        <section className="mb-16">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <Users className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Gestión de Contactos</CardTitle>
                <CardDescription>Administra todos tus contactos y leads en un solo lugar.</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Building2 className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Empresas</CardTitle>
                <CardDescription>Organiza y gestiona tus cuentas empresariales.</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <DollarSign className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Pipeline de Ventas</CardTitle>
                <CardDescription>Visualiza y sigue tu embudo de ventas con facilidad.</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Ticket className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Tickets de Soporte</CardTitle>
                <CardDescription>Gestiona las solicitudes de tus clientes.</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <BarChart3 className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Informes y Analytics</CardTitle>
                <CardDescription>Métricas en tiempo real para mejores decisiones.</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Bell className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Notificaciones</CardTitle>
                <CardDescription>Recibe alertas sobre cambios importantes.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>
        {!userId && (
          <section className="text-center">
            <h2 className="mb-4 text-2xl font-bold">¿Listo para empezar?</h2>
            <p className="mb-6 text-muted-foreground">
              Únete a cientos de equipos que ya usan KDL CRM
            </p>
            <Link href="/sign-up">
              <Button size="lg">Crear cuenta gratuita</Button>
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}