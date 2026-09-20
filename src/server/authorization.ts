import type { CurrentUser, UserRole } from "@/lib/auth/types";
import { AppError } from "./errors";

export function assertRole(user: CurrentUser, role: UserRole): CurrentUser {
  if (user.role !== role) {
    throw new AppError(403, "FORBIDDEN", "You do not have access to this resource");
  }
  return user;
}

export function assertOwnership(actorId: string, ownerId: string): void {
  if (actorId !== ownerId) {
    throw new AppError(403, "FORBIDDEN", "You do not own this resource");
  }
}
