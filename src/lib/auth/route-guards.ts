import { redirect } from "@tanstack/react-router";

import { getCurrentUser } from "@/lib/api/auth.functions";
import type { UserRole } from "./types";

export async function requireRouteRole(role: UserRole) {
  const user = await getCurrentUser();

  if (!user) {
    throw redirect({ to: "/login" });
  }

  if (user.role !== role) {
    throw redirect({ to: role === "FACULTY" ? "/" : "/faculty" });
  }

  return user;
}

export async function redirectAuthenticatedUser() {
  const user = await getCurrentUser();
  if (user) {
    throw redirect({ to: user.role === "FACULTY" ? "/faculty" : "/" });
  }
}
