import { UserButton } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfileSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Perfil</h1>
          <p className="text-muted-foreground">Gestiona tu información personal</p>
        </div>
        <UserButton />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Información del perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Aquí podrás editar tu perfil. Esta función coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}