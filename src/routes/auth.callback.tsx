import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({ meta: [{ title: "Confirming your email · PresenceOS" }] }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Confirming your email…");

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      const supabase = getSupabaseBrowserClient();

      try {
        const url = new URL(window.location.href);
        const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
        const code = url.searchParams.get("code");
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        const errorDescription =
          url.searchParams.get("error_description") ?? hash.get("error_description");

        if (errorDescription) {
          if (!cancelled) setMessage(errorDescription);
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }

        const { data } = await supabase.auth.getSession();
        window.history.replaceState({}, "", "/auth/callback");

        if (cancelled) return;

        if (!data.session) {
          setMessage("Your email is confirmed. Please sign in to continue.");
          await router.navigate({ to: "/login" });
          return;
        }

        setMessage("Signed in. Taking you to your dashboard…");
        await router.invalidate();
        await router.navigate({ to: "/" });
      } catch {
        if (cancelled) return;
        setMessage("That confirmation link is invalid or expired. Please sign in again.");
        await router.navigate({ to: "/login" });
      }
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center">
      <section className="surface-card w-full rounded-3xl p-8 text-center">
        <h1 className="font-display text-2xl font-semibold">Almost there</h1>
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      </section>
    </div>
  );
}
