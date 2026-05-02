import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KDL CRM - Sistema de Gestión de Relaciones con Clientes",
  description: "CRM moderno y profesional para gestionar tus relaciones con clientes",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
