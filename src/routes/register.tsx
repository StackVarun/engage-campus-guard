import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redirectAuthenticatedUser } from "@/lib/auth/route-guards";
import { registerStudent } from "@/lib/api/auth.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/register")({
  beforeLoad: redirectAuthenticatedUser,
  head: () => ({ meta: [{ title: "Register · PresenceOS" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const router = useRouter();
  const register = useServerFn(registerStudent);
  const [form, setForm] = useState({ email: "", password: "", fullName: "", rollNumber: "" });
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    try {
      const result = await register({ data: form });
      if (!result.ok) {
        toast.error("Unable to create the account. Check the details and try again.");
        return;
      }

      if (result.needsEmailConfirmation || !result.user) {
        toast.success("Account created", {
          description: "Confirm your email, then sign in to continue.",
        });
        await router.navigate({ to: "/login" });
        return;
      }

      await router.navigate({ to: "/" });
      await router.invalidate();
    } catch {
      toast.error("Unable to create the account. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[65vh] max-w-md items-center">
      <section className="surface-card w-full rounded-3xl p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Student registration
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Create your account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Student registration creates a STUDENT account. Faculty accounts are provisioned
          separately and use the same sign-in flow.
        </p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="full-name">Full name</Label>
            <Input
              id="full-name"
              value={form.fullName}
              onChange={(event) =>
                setForm((current) => ({ ...current, fullName: event.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="roll-number">Roll number</Label>
            <Input
              id="roll-number"
              value={form.rollNumber}
              onChange={(event) =>
                setForm((current) => ({ ...current, rollNumber: event.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-email">Email</Label>
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-password">Password</Label>
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              required
            />
          </div>
          <Button className="w-full" type="submit" disabled={pending}>
            {pending ? "Creating account…" : "Create student account"}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link className="text-primary hover:underline" to="/login">
            Sign in
          </Link>
        </p>
      </section>
    </div>
  );
}
