import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redirectAuthenticatedUser } from "@/lib/auth/route-guards";
import { login } from "@/lib/api/auth.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/login")({
  beforeLoad: redirectAuthenticatedUser,
  head: () => ({ meta: [{ title: "Sign in · PresenceOS" }] }),
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const signIn = useServerFn(login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    try {
      const result = await signIn({ data: { email, password } });
      if (!result.ok) {
        toast.error(
          result.error === "ACCOUNT_NOT_PROVISIONED"
            ? "Your account is not provisioned for SCAAP yet."
            : "Invalid email or password.",
        );
        return;
      }

      await router.navigate({ to: result.user.role === "FACULTY" ? "/faculty" : "/" });
      await router.invalidate();
    } catch {
      toast.error("Unable to sign in. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthPanel
      eyebrow="SCAAP foundation"
      title="Sign in"
      description="Use your SCAAP account to access the student or faculty workspace."
    >
      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        <Button className="w-full" type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        New student?{" "}
        <Link className="text-primary hover:underline" to="/register">
          Create an account
        </Link>
      </p>
    </AuthPanel>
  );
}

function AuthPanel({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-md items-center">
      <section className="surface-card w-full rounded-3xl p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6">{children}</div>
      </section>
    </div>
  );
}
