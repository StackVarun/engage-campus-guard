import { describe, expect, it } from "vitest";

import type { StudentUser } from "@/lib/auth/types";
import { classOfferingSchema, enrollmentSchema } from "@/lib/validation/classes";
import { credentialsSchema, studentRegistrationSchema } from "@/lib/validation/auth";
import { assertOwnership, assertRole } from "../authorization";

const student: StudentUser = {
  id: "student-1",
  email: "student@example.com",
  role: "STUDENT",
  profile: null,
};

describe("Phase 1 authorization", () => {
  it("allows a user to satisfy their own role requirement", () => {
    expect(assertRole(student, "STUDENT")).toBe(student);
  });

  it("rejects a student attempting faculty functionality", () => {
    expect(() => assertRole(student, "FACULTY")).toThrowError("You do not have access");
  });

  it("rejects access to another user's owned resource", () => {
    expect(() => assertOwnership(student.id, "student-2")).toThrowError("You do not own");
  });

  it("allows access to a resource owned by the authenticated user", () => {
    expect(() => assertOwnership(student.id, student.id)).not.toThrow();
  });
});

describe("Phase 1 server-boundary validation", () => {
  it("rejects invalid login credentials", () => {
    expect(credentialsSchema.safeParse({ email: "not-an-email", password: "" }).success).toBe(
      false,
    );
  });

  it("does not accept a client-supplied role during student registration", () => {
    const result = studentRegistrationSchema.safeParse({
      email: "student@example.com",
      password: "correct horse battery staple",
      fullName: "A Student",
      rollNumber: "S-001",
      role: "FACULTY",
    });

    expect(result.success).toBe(false);
  });

  it("does not accept a client-supplied faculty owner", () => {
    const result = classOfferingSchema.safeParse({
      courseId: "00000000-0000-0000-0000-000000000001",
      section: "A",
      academicYear: "2026-27",
      term: "Semester 1",
      facultyId: "00000000-0000-0000-0000-000000000002",
    });

    expect(result.success).toBe(false);
  });

  it("validates enrollment input without accepting a student id", () => {
    const result = enrollmentSchema.safeParse({
      classOfferingId: "00000000-0000-0000-0000-000000000001",
      studentId: "00000000-0000-0000-0000-000000000002",
    });

    expect(result.success).toBe(false);
  });
});
