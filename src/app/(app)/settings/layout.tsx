import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AppLayout from "@/components/app/app-layout";

export default async function layout({ children }: { children: ReactNode }) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }
  
  return <AppLayout>{children}</AppLayout>;
}