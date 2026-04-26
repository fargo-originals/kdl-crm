import { auth } from "@clerk/nextjs/server";
import { supabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: dbUser } = await supabaseServer.from("users").select("id").eq("clerk_id", userId).maybeSingle();
  if (!dbUser) return NextResponse.json([]);

  const { data } = await supabaseServer.from("integrations").select("*").eq("user_id", dbUser.id).eq("is_active", true);
  return NextResponse.json(data || []);
}
