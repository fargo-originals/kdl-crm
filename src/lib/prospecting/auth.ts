import { auth } from "@clerk/nextjs/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function getCurrentDbUserId() {
  const { userId } = await auth();
  if (!userId) return { clerkUserId: null, dbUserId: null, error: "Unauthorized" };

  const { data, error } = await supabaseServer
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  if (error) return { clerkUserId: userId, dbUserId: null, error: error.message };
  if (!data?.id) return { clerkUserId: userId, dbUserId: null, error: "User not found" };

  return { clerkUserId: userId, dbUserId: data.id as string, error: null };
}
