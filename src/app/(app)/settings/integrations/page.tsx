import { UserButton } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function IntegrationsSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integraciones</h1>
          <p className="text-muted-foreground">Conecta servicios externos</p>
        </div>
        <UserButton />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Servicios disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Integraciones coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}