import { Webhook } from "svix";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase-server";

interface WebhookEvent {
  data: {
    id: string;
    email_addresses: Array<{ email_address: string }>;
    first_name?: string;
    last_name?: string;
    image_url?: string;
  };
  type: string;
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return new Response("Missing CLERK_WEBHOOK_SECRET", { status: 500 });
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await req.text();
  const payload = JSON.parse(body) as WebhookEvent;

  const wh = new Webhook(WEBHOOK_SECRET);
  let msg: WebhookEvent;

  try {
    msg = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const eventType = msg.type;

  if (eventType === "user.created" || eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = msg.data;
    const email = email_addresses?.[0]?.email_address;

    if (email) {
      const { count } = await supabaseServer
        .from("users")
        .select("*", { count: "exact", head: true });

      const role = count === 0 ? "owner" : "seller";

      const { error } = await supabaseServer
        .from("users")
        .upsert({
          clerk_id: id,
          email,
          first_name: first_name || "",
          last_name: last_name || "",
          avatar_url: image_url || "",
          role,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "clerk_id",
        });

      if (error) {
        console.error("Supabase error:", error);
        return new Response("Database error", { status: 500 });
      }
    }
  }

  if (eventType === "user.deleted") {
    const { id } = msg.data;
    await supabaseServer
      .from("users")
      .delete()
      .eq("clerk_id", id);
  }

  return new Response("OK", { status: 200 });
}