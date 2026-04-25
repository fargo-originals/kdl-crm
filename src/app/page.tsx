import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, DollarSign, Ticket, BarChart3, Bell } from "lucide-react";

const features = [
  {
    title: "Gestión de Contactos",
    description: "Administra todos tus contactos y leads en un solo lugar.",
    icon: Users,
  },
  {
    title: "Empresas",
    description: "Organiza y gestiona tus cuentas empresariales.",
    icon: Building2,
  },
  {
    title: "Pipeline de Ventas",
    description: "Visualiza y sigue tu embudo de ventas con facilidad.",
    icon: DollarSign,
  },
  {
    title: "Tickets de Soporte",
    description: "Gestiona las solicitudes de tus clientes.",
    icon: Ticket,
  },
  {
    title: "Informes y Analytics",
    description: "Métricas en tiempo real para mejores decisiones.",
    icon: BarChart3,
  },
  {
    title: "Notificaciones",
    description: "Recibe alertas sobre cambios importantes.",
    icon: Bell,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold text-primary">
            KDL CRM
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/sign-in" className="text-sm font-medium text-muted-foreground hover:text-primary">
              Iniciar sesión
            </Link>
            <Link href="/sign-up">
              <Button>Empezar gratis</Button>
            </Link>
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
            <Link href="/sign-up">
              <Button size="lg">Empezar gratis</Button>
            </Link>
            <Link href="/sign-in">
              <Button variant="outline" size="lg">
                Ver demo
              </Button>
            </Link>
          </div>
        </section>
        <section className="mb-16">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <feature.icon className="mb-2 h-8 w-8 text-primary" />
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
        <section className="text-center">
          <h2 className="mb-4 text-2xl font-bold">¿Listo para empezar?</h2>
          <p className="mb-6 text-muted-foreground">
            Únete a cientos de equipos que ya usan KDL CRM
          </p>
          <Link href="/sign-up">
            <Button size="lg">Crear cuenta gratuita</Button>
          </Link>
        </section>
      </div>
    </div>
  );
}