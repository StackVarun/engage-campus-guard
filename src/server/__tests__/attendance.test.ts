import { describe, expect, it } from "vitest";

import type { FacultyUser, StudentUser } from "@/lib/auth/types";
import {
  attendanceClassSchema,
  attendanceSessionSchema,
  startAttendanceSessionSchema,
  submitAttendanceChallengeSchema,
} from "@/lib/validation/attendance";
import {
  assertAttendanceSubmissionEligibility,
  assertFacultyOwnsClass,
  type AttendanceEligibilitySnapshot,
} from "../attendance-policy";

const student: StudentUser = {
  id: "student-1",
  email: "student@example.com",
  role: "STUDENT",
  profile: null,
};

const faculty: FacultyUser = {
  id: "faculty-1",
  email: "faculty@example.com",
  role: "FACULTY",
  profile: null,
};

const now = new Date("2026-09-19T10:00:00.000Z");

function validSnapshot(
  overrides: Partial<AttendanceEligibilitySnapshot> = {},
): AttendanceEligibilitySnapshot {
  return {
    actor: student,
    studentProfileExists: true,
    sessionExists: true,
    sessionId: "session-1",
    sessionStatus: "ACTIVE",
    sessionStartedAt: new Date("2026-09-19T09:59:00.000Z"),
    sessionExpiresAt: new Date("2026-09-19T10:05:00.000Z"),
    challengeExists: true,
    challengeSessionId: "session-1",
    challengeExpiresAt: new Date("2026-09-19T10:05:00.000Z"),
    enrolled: true,
    alreadyRecorded: false,
    now,
    ...overrides,
  };
}

describe("Phase 2A attendance authorization", () => {
  it("rejects a student attempting to start a session", () => {
    expect(() => assertFacultyOwnsClass(student, "faculty-1")).toThrowError(
      "You do not have access",
    );
  });

  it("rejects a faculty member who does not own the class", () => {
    expect(() => assertFacultyOwnsClass(faculty, "faculty-2")).toThrowError("You do not own");
  });

  it("rejects an unauthenticated session starter", () => {
    expect(() => assertFacultyOwnsClass(null, "faculty-1")).toThrowError(
      "Authentication is required",
    );
  });

  it("rejects a non-enrolled student", () => {
    expect(() =>
      assertAttendanceSubmissionEligibility(validSnapshot({ enrolled: false })),
    ).toThrowError("not enrolled");
  });

  it("does not accept a client-supplied student identity", () => {
    expect(
      submitAttendanceChallengeSchema.safeParse({
        attendanceSessionId: "00000000-0000-0000-0000-000000000001",
        challengeToken: "00000000-0000-0000-0000-000000000002",
        studentId: "00000000-0000-0000-0000-000000000003",
      }).success,
    ).toBe(false);
  });

  it("rejects an expired challenge", () => {
    expect(() =>
      assertAttendanceSubmissionEligibility(
        validSnapshot({ challengeExpiresAt: new Date("2026-09-19T09:59:59.000Z") }),
      ),
    ).toThrowError("challenge has expired");
  });

  it("rejects a closed session", () => {
    expect(() =>
      assertAttendanceSubmissionEligibility(validSnapshot({ sessionStatus: "CLOSED" })),
    ).toThrowError("session is closed");
  });

  it("rejects an invalid challenge", () => {
    expect(() =>
      assertAttendanceSubmissionEligibility(
        validSnapshot({ challengeExists: false, challengeSessionId: null }),
      ),
    ).toThrowError("challenge is invalid");
  });

  it("rejects duplicate attendance", () => {
    expect(() =>
      assertAttendanceSubmissionEligibility(validSnapshot({ alreadyRecorded: true })),
    ).toThrowError("already been recorded");
  });

  it("accepts a valid attendance request", () => {
    expect(() => assertAttendanceSubmissionEligibility(validSnapshot())).not.toThrow();
  });
});

describe("Phase 2A attendance input validation", () => {
  it("validates start-session input without role or faculty IDs", () => {
    const result = startAttendanceSessionSchema.safeParse({
      classOfferingId: "00000000-0000-0000-0000-000000000001",
      durationSeconds: 300,
      facultyId: "00000000-0000-0000-0000-000000000002",
    });

    expect(result.success).toBe(false);
  });

  it("validates session lookup input without accepting a student ID", () => {
    const result = attendanceClassSchema.safeParse({
      classOfferingId: "00000000-0000-0000-0000-000000000001",
      studentId: "00000000-0000-0000-0000-000000000002",
    });

    expect(result.success).toBe(false);
  });

  it("validates close-session input", () => {
    expect(
      attendanceSessionSchema.safeParse({
        attendanceSessionId: "00000000-0000-0000-0000-000000000001",
      }).success,
    ).toBe(true);
  });
});
