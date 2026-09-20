/// <reference types="vite/client" />

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function getSupabaseBrowserClient(): SupabaseClient {
  return supabase;
}
