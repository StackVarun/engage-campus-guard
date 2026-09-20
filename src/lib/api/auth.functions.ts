import { createServerFn } from "@tanstack/react-start";

import type { CurrentUser } from "@/lib/auth/types";
import { credentialsSchema, studentRegistrationSchema } from "@/lib/validation/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserServer, requireAuthenticatedUser } from "@/server/auth.server";

type AuthFailure = {
  ok: false;
  error: "INVALID_CREDENTIALS" | "SIGNUP_FAILED" | "ACCOUNT_NOT_PROVISIONED" | "EMAIL_NOT_CONFIRMED";
  message?: string;
};

type AuthSuccess = {
  ok: true;
  user: CurrentUser;
  needsEmailConfirmation?: false;
};

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () =>
  getCurrentUserServer(),
);

export const login = createServerFn({ method: "POST" })
  .validator(credentialsSchema)
  .handler(async ({ data }): Promise<AuthSuccess | AuthFailure> => {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      const notConfirmed = /confirm/i.test(error.message);
      return {
        ok: false,
        error: notConfirmed ? "EMAIL_NOT_CONFIRMED" : "INVALID_CREDENTIALS",
        message: error.message,
      };
    }

    // Reuse the client that performed sign-in. Its SSR storage overlay contains
    // the new session before the response cookies reach a subsequent request.
    const user = await getCurrentUserServer(supabase);
    if (!user) {
      await supabase.auth.signOut();
      return { ok: false, error: "ACCOUNT_NOT_PROVISIONED" };
    }

    return { ok: true, user };
  });

export const registerStudent = createServerFn({ method: "POST" })
  .validator(studentRegistrationSchema)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: data.emailRedirectTo,
        data: {
          account_type: "STUDENT",
          full_name: data.fullName,
          roll_number: data.rollNumber,
        },
      },
    });

    if (error || !authData.user) {
      return {
        ok: false as const,
        error: "SIGNUP_FAILED" as const,
        message: error?.message,
      };
    }

    const user = await getCurrentUserServer();
    if (!user) {
      return {
        ok: true as const,
        user: null,
        needsEmailConfirmation: true as const,
      };
    }

    return { ok: true as const, user, needsEmailConfirmation: false as const };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error(error);
    throw new Error("Unable to sign out");
  }
  return { ok: true as const };
});

export const getRequiredCurrentUser = createServerFn({ method: "GET" }).handler(async () =>
  requireAuthenticatedUser(),
);
