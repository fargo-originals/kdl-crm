import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import AppLayout from "@/components/app/app-layout";
import { getSession } from "@/lib/auth/session";

export default async function layout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  return <AppLayout>{children}</AppLayout>;
}
