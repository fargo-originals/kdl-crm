import { CalendarCheck } from "lucide-react";

export default function BookedPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; date?: string; time?: string; title?: string }>;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 p-4">
            <CalendarCheck className="h-10 w-10 text-green-600" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">¡Reserva confirmada!</h1>
          <p className="text-muted-foreground">
            Hemos recibido tu solicitud y te hemos enviado un email de confirmación.
          </p>
        </div>
        <div className="rounded-lg border bg-muted/50 px-6 py-4 space-y-1 text-left">
          <p className="text-sm font-medium text-muted-foreground">Resumen de tu cita</p>
          <BookingSummary searchParams={searchParams} />
        </div>
        <p className="text-sm text-muted-foreground">
          Si necesitas cambiar la fecha, responde al email de confirmación.
        </p>
      </div>
    </div>
  );
}

async function BookingSummary({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; date?: string; time?: string; title?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="space-y-1 mt-1">
      {params.title && <p className="font-medium">{params.title}</p>}
      {params.date && params.time && (
        <p className="text-sm">{params.date} a las {params.time}</p>
      )}
      {params.name && (
        <p className="text-sm text-muted-foreground">Para: {params.name}</p>
      )}
    </div>
  );
}
