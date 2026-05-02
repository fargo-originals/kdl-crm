import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SecuritySettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Seguridad</h1>
          <p className="text-muted-foreground">Configuración de seguridad</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Seguridad de la cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Para cambiar tu contraseña, contacta con el administrador del sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
