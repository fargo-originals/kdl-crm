import { SignIn } from "@clerk/nextjs";
import { Globe } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <Globe className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 text-2xl font-bold">KDL CRM</h1>
          <p className="text-sm text-muted-foreground">Inicia sesión</p>
        </div>
        <SignIn 
          routing="virtual"
          redirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}