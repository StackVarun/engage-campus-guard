import type { CurrentUser } from "@/lib/auth/types";
import { AppError } from "./errors";
import { assertOwnership, assertRole } from "./authorization";

export type AttendanceSessionStatus = "ACTIVE" | "CLOSED";

export type AttendanceEligibilitySnapshot = {
  actor: CurrentUser | null;
  studentProfileExists: boolean;
  sessionExists: boolean;
  sessionId: string;
  sessionStatus: AttendanceSessionStatus | null;
  sessionStartedAt: Date | null;
  sessionExpiresAt: Date | null;
  challengeExists: boolean;
  challengeSessionId: string | null;
  challengeExpiresAt: Date | null;
  enrolled: boolean;
  alreadyRecorded: boolean;
  now: Date;
};

export function assertFacultyOwnsClass(actor: CurrentUser | null, classFacultyId: string): void {
  if (!actor) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication is required");
  }

  assertRole(actor, "FACULTY");
  assertOwnership(actor.id, classFacultyId);
}

export function assertAttendanceSubmissionEligibility(
  snapshot: AttendanceEligibilitySnapshot,
): void {
  if (!snapshot.actor) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication is required");
  }

  assertRole(snapshot.actor, "STUDENT");

  if (!snapshot.studentProfileExists) {
    throw new AppError(409, "STUDENT_PROFILE_REQUIRED", "A student profile is required");
  }

  if (!snapshot.sessionExists || !snapshot.sessionStatus) {
    throw new AppError(404, "ATTENDANCE_SESSION_NOT_FOUND", "Attendance session was not found");
  }

  if (snapshot.sessionStatus !== "ACTIVE") {
    throw new AppError(409, "ATTENDANCE_SESSION_CLOSED", "Attendance session is closed");
  }

  if (
    !snapshot.sessionStartedAt ||
    !snapshot.sessionExpiresAt ||
    snapshot.now < snapshot.sessionStartedAt
  ) {
    throw new AppError(409, "ATTENDANCE_SESSION_NOT_ACTIVE", "Attendance session is not active");
  }

  if (snapshot.now >= snapshot.sessionExpiresAt) {
    throw new AppError(410, "ATTENDANCE_SESSION_EXPIRED", "Attendance session has expired");
  }

  if (!snapshot.challengeExists || snapshot.challengeSessionId !== snapshot.sessionId) {
    throw new AppError(400, "INVALID_ATTENDANCE_CHALLENGE", "Attendance challenge is invalid");
  }

  if (!snapshot.challengeExpiresAt || snapshot.now >= snapshot.challengeExpiresAt) {
    throw new AppError(410, "ATTENDANCE_CHALLENGE_EXPIRED", "Attendance challenge has expired");
  }

  if (!snapshot.enrolled) {
    throw new AppError(403, "NOT_ENROLLED", "Student is not enrolled in this class");
  }

  if (snapshot.alreadyRecorded) {
    throw new AppError(409, "ATTENDANCE_ALREADY_RECORDED", "Attendance has already been recorded");
  }
}
