import { UserButton } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ImportSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Importar Datos</h1>
          <p className="text-muted-foreground">Importa contactos desde CSV/Excel</p>
        </div>
        <UserButton />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Importar contactos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Importación de datos coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}