/// <reference types="vite/client" />

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      import.meta.env["VITE_SUPABASE_URL"],
      import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
    );
  }

  return browserClient;
}
