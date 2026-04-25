import type { ReactNode } from "react";
import AppLayout from "@/components/app/app-layout";

export default function layout({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}