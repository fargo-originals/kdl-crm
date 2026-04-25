import { UserButton } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotificationsSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notificaciones</h1>
          <p className="text-muted-foreground">Configura tus alertas</p>
        </div>
        <UserButton />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Configuración de notificaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Notificaciones coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}