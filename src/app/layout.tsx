import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/app/theme-provider";

export const metadata: Metadata = {
  title: "KDL CRM - Sistema de Gestión de Relaciones con Clientes",
  description: "CRM moderno y profesional para gestionar tus relaciones con clientes",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KDL CRM",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
