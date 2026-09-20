import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCookies, getRequestHeader, setCookie } from "@tanstack/react-start/server";

function getSupabaseEnvironment() {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const publishableKey =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];

  if (!url || !publishableKey) {
    throw new Error("Supabase environment is not configured");
  }

  return { url, publishableKey };
}

export function getSupabaseServerClient(): SupabaseClient {
  const { url, publishableKey } = getSupabaseEnvironment();
  const authorization = getRequestHeader("authorization");

  return createServerClient(url, publishableKey, {
    global: authorization ? { headers: { Authorization: authorization } } : undefined,
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          setCookie(name, value, options);
        });
      },
    },
  });
}
