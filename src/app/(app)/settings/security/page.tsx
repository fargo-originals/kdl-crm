import { UserButton } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SecuritySettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Seguridad</h1>
          <p className="text-muted-foreground">Configuración de seguridad</p>
        </div>
        <UserButton />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Seguridad de la cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Seguridad gestionada por Clerk.</p>
        </CardContent>
      </Card>
    </div>
  );
}