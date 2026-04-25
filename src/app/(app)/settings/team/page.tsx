import { UserButton } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TeamSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Equipo</h1>
          <p className="text-muted-foreground">Administra usuarios y roles</p>
        </div>
        <UserButton />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Usuarios del equipo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Gestión de usuarios coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}