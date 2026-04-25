import { UserButton } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PipelineSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground">Configura las etapas del pipeline</p>
        </div>
        <UserButton />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Etapas del pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Configuración de pipeline coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}