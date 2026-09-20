import type { SupabaseClient } from "@supabase/supabase-js";

import type { CurrentUser } from "@/lib/auth/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { AppError } from "./errors";
import { requireRole } from "./auth.server";
import {
  assertAttendanceSubmissionEligibility,
  assertFacultyOwnsClass,
  type AttendanceEligibilitySnapshot,
  type AttendanceSessionStatus,
} from "./attendance-policy";

type AttendanceSessionRow = {
  id: string;
  class_offering_id: string;
  started_by: string;
  status: AttendanceSessionStatus;
  started_at: string;
  expires_at: string;
  closed_at: string | null;
  created_at: string;
};

type AttendanceChallengeRow = {
  id: string;
  attendance_session_id: string;
  challenge_token: string;
  issued_at: string;
  expires_at: string;
};

type AttendanceRecordRow = {
  id: string;
  attendance_session_id: string;
  student_id: string;
  marked_at: string;
};

type StartAttendanceRow = {
  session_id: string;
  class_offering_id: string;
  started_by: string;
  status: AttendanceSessionStatus;
  started_at: string;
  expires_at: string;
  closed_at: string | null;
  session_created_at: string;
  challenge_id: string;
  challenge_token: string;
  challenge_issued_at: string;
  challenge_expires_at: string;
};

export type AttendanceChallenge = {
  id: string;
  sessionId: string;
  token: string;
  issuedAt: string;
  expiresAt: string;
};

export type AttendanceSession = {
  id: string;
  classOfferingId: string;
  startedBy: string;
  status: AttendanceSessionStatus;
  startedAt: string;
  expiresAt: string;
  closedAt: string | null;
  createdAt: string;
  challenge: AttendanceChallenge | null;
};

export type AttendanceRecord = {
  id: string;
  attendanceSessionId: string;
  studentId: string;
  markedAt: string;
};

function toChallenge(row: AttendanceChallengeRow): AttendanceChallenge {
  return {
    id: row.id,
    sessionId: row.attendance_session_id,
    token: row.challenge_token,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
  };
}

function toSession(
  row: AttendanceSessionRow,
  challenge: AttendanceChallenge | null,
): AttendanceSession {
  return {
    id: row.id,
    classOfferingId: row.class_offering_id,
    startedBy: row.started_by,
    status: row.status,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    challenge,
  };
}

function toStartSession(row: StartAttendanceRow): AttendanceSession {
  return toSession(
    {
      id: row.session_id,
      class_offering_id: row.class_offering_id,
      started_by: row.started_by,
      status: row.status,
      started_at: row.started_at,
      expires_at: row.expires_at,
      closed_at: row.closed_at,
      created_at: row.session_created_at,
    },
    {
      id: row.challenge_id,
      sessionId: row.session_id,
      token: row.challenge_token,
      issuedAt: row.challenge_issued_at,
      expiresAt: row.challenge_expires_at,
    },
  );
}

function toRecord(row: AttendanceRecordRow): AttendanceRecord {
  return {
    id: row.id,
    attendanceSessionId: row.attendance_session_id,
    studentId: row.student_id,
    markedAt: row.marked_at,
  };
}

function throwRpcError(
  error: { code?: string; message?: string },
  fallbackCode: string,
  fallbackMessage: string,
  duplicateCode = "ATTENDANCE_ALREADY_RECORDED",
  duplicateMessage = "Attendance has already been recorded",
): never {
  switch (error.code) {
    case "23505":
    case "P0008":
      throw new AppError(409, duplicateCode, duplicateMessage);
    case "42501":
      throw new AppError(403, "FORBIDDEN", "You do not have access to this attendance resource");
    case "P0002":
      throw new AppError(404, "ATTENDANCE_SESSION_NOT_FOUND", "Attendance session was not found");
    case "P0003":
      throw new AppError(400, "INVALID_ATTENDANCE_CHALLENGE", "Attendance challenge is invalid");
    case "P0004":
      throw new AppError(409, "ATTENDANCE_SESSION_CLOSED", "Attendance session is closed");
    case "P0005":
      throw new AppError(410, "ATTENDANCE_WINDOW_EXPIRED", "Attendance window has expired");
    case "P0006":
      throw new AppError(403, "NOT_ENROLLED", "Student is not enrolled in this class");
    case "P0007":
      throw new AppError(409, "STUDENT_PROFILE_REQUIRED", "A student profile is required");
    case "22023":
      throw new AppError(400, "INVALID_ATTENDANCE_DURATION", "Attendance duration is invalid");
    default:
      console.error(error);
      throw new AppError(400, fallbackCode, fallbackMessage);
  }
}

async function getChallenge(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<AttendanceChallenge | null> {
  const { data, error } = await supabase
    .from("attendance_challenges")
    .select("id, attendance_session_id, challenge_token, issued_at, expires_at")
    .eq("attendance_session_id", sessionId)
    .maybeSingle();

  if (error)
    throw new AppError(500, "ATTENDANCE_LOOKUP_FAILED", "Unable to load attendance challenge");
  return data ? toChallenge(data as AttendanceChallengeRow) : null;
}

export async function startAttendanceSessionServer(input: {
  classOfferingId: string;
  durationSeconds: number;
}): Promise<AttendanceSession> {
  const faculty = await requireRole("FACULTY");
  const supabase = getSupabaseServerClient();
  const { data: classOffering, error: classError } = await supabase
    .from("class_offerings")
    .select("id, faculty_id")
    .eq("id", input.classOfferingId)
    .maybeSingle();

  if (classError) {
    throw new AppError(500, "CLASS_LOOKUP_FAILED", "Unable to verify class ownership");
  }

  if (!classOffering) {
    throw new AppError(403, "FORBIDDEN", "You do not own this class offering");
  }

  assertFacultyOwnsClass(faculty, classOffering.faculty_id as string);

  const { data, error } = await supabase
    .rpc("start_attendance_session", {
      p_class_offering_id: input.classOfferingId,
      p_duration_seconds: input.durationSeconds,
    })
    .single();

  if (error) {
    throwRpcError(
      error,
      "ATTENDANCE_START_FAILED",
      "Unable to start attendance session",
      "ATTENDANCE_SESSION_ALREADY_ACTIVE",
      "An attendance session is already active for this class",
    );
  }

  return toStartSession(data as unknown as StartAttendanceRow);
}

export async function closeAttendanceSessionServer(
  attendanceSessionId: string,
): Promise<AttendanceSession> {
  await requireRole("FACULTY");
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .rpc("close_attendance_session", { p_attendance_session_id: attendanceSessionId })
    .single();

  if (error) {
    throwRpcError(error, "ATTENDANCE_CLOSE_FAILED", "Unable to close attendance session");
  }

  return toSession(data as unknown as AttendanceSessionRow, null);
}

async function getActiveSession(
  supabase: SupabaseClient,
  classOfferingId: string,
  includeChallenge: boolean,
): Promise<AttendanceSession | null> {
  const { data, error } = await supabase
    .from("attendance_sessions")
    .select(
      "id, class_offering_id, started_by, status, started_at, expires_at, closed_at, created_at",
    )
    .eq("class_offering_id", classOfferingId)
    .eq("status", "ACTIVE")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error)
    throw new AppError(500, "ATTENDANCE_LOOKUP_FAILED", "Unable to load attendance session");
  if (!data) return null;

  const row = data as AttendanceSessionRow;
  return toSession(row, includeChallenge ? await getChallenge(supabase, row.id) : null);
}

export async function getActiveAttendanceSessionServer(
  classOfferingId: string,
): Promise<AttendanceSession | null> {
  const faculty = await requireRole("FACULTY");
  const supabase = getSupabaseServerClient();
  const { data: classOffering, error } = await supabase
    .from("class_offerings")
    .select("id, faculty_id")
    .eq("id", classOfferingId)
    .maybeSingle();

  if (error) throw new AppError(500, "CLASS_LOOKUP_FAILED", "Unable to verify class ownership");
  if (!classOffering) return null;
  assertFacultyOwnsClass(faculty, classOffering.faculty_id as string);
  return getActiveSession(supabase, classOfferingId, true);
}

export async function getActiveAttendanceSessionForStudentServer(
  classOfferingId: string,
): Promise<AttendanceSession | null> {
  await requireRole("STUDENT");
  return getActiveSession(getSupabaseServerClient(), classOfferingId, false);
}

async function getSubmissionSnapshot(
  supabase: SupabaseClient,
  actor: CurrentUser,
  attendanceSessionId: string,
  challengeToken: string,
): Promise<AttendanceEligibilitySnapshot> {
  const { data, error } = await supabase
    .rpc("get_attendance_submission_context", {
      p_attendance_session_id: attendanceSessionId,
      p_challenge_token: challengeToken,
    })
    .single();

  if (error || !data) {
    throw new AppError(500, "ATTENDANCE_LOOKUP_FAILED", "Unable to validate attendance submission");
  }

  const context = data as {
    student_profile_exists: boolean;
    session_exists: boolean;
    session_id: string;
    session_status: AttendanceSessionStatus | null;
    session_started_at: string | null;
    session_expires_at: string | null;
    challenge_exists: boolean;
    challenge_session_id: string | null;
    challenge_expires_at: string | null;
    enrolled: boolean;
    already_recorded: boolean;
  };

  return {
    actor,
    studentProfileExists: context.student_profile_exists,
    sessionExists: context.session_exists,
    sessionId: context.session_id,
    sessionStatus: context.session_status,
    sessionStartedAt: context.session_started_at ? new Date(context.session_started_at) : null,
    sessionExpiresAt: context.session_expires_at ? new Date(context.session_expires_at) : null,
    challengeExists: context.challenge_exists,
    challengeSessionId: context.challenge_session_id,
    challengeExpiresAt: context.challenge_expires_at
      ? new Date(context.challenge_expires_at)
      : null,
    enrolled: context.enrolled,
    alreadyRecorded: context.already_recorded,
    now: new Date(),
  };
}

export async function submitAttendanceChallengeServer(input: {
  attendanceSessionId: string;
  challengeToken: string;
}): Promise<AttendanceRecord> {
  const student = await requireRole("STUDENT");
  const supabase = getSupabaseServerClient();
  const snapshot = await getSubmissionSnapshot(
    supabase,
    student,
    input.attendanceSessionId,
    input.challengeToken,
  );
  assertAttendanceSubmissionEligibility(snapshot);

  const { data, error } = await supabase
    .rpc("submit_attendance_challenge", {
      p_attendance_session_id: input.attendanceSessionId,
      p_challenge_token: input.challengeToken,
    })
    .single();

  if (error) {
    throwRpcError(error, "ATTENDANCE_SUBMIT_FAILED", "Unable to record attendance");
  }

  return toRecord(data as unknown as AttendanceRecordRow);
}
