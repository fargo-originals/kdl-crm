import type { ReactNode } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AppLayout from "@/components/app/app-layout";
import { supabaseServer } from "@/lib/supabase-server";

async function syncUserToSupabase(clerkUserId: string) {
  const user = await currentUser();
  if (!user) return;

  const email = user.emailAddresses[0]?.emailAddress;
  if (!email) return;

  const { data: existing } = await supabaseServer
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .maybeSingle();

  if (!existing) {
    const { count } = await supabaseServer
      .from("users")
      .select("*", { count: "exact", head: true });

    const role = count === 0 ? "owner" : "seller";

    await supabaseServer.from("users").insert({
      clerk_id: user.id,
      email,
      first_name: user.firstName || "",
      last_name: user.lastName || "",
      avatar_url: user.imageUrl || "",
      role,
    });
  }
}

export default async function layout({ children }: { children: ReactNode }) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  await syncUserToSupabase(userId!);

  return <AppLayout>{children}</AppLayout>;
}
