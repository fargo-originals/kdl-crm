import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _instance: SupabaseClient | null = null;

function getInstance(): SupabaseClient {
  if (!_instance) {
    _instance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return _instance;
}

export function getSupabaseServer(): SupabaseClient {
  return getInstance();
}

// Lazy proxy — no llama createClient al importar el módulo,
// solo cuando se accede a una propiedad (.from, .rpc, etc.)
export const supabaseServer: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, _receiver) {
    const instance = getInstance();
    const value = (instance as any)[prop];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
