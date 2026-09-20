import { createServerFn } from "@tanstack/react-start";

import {
  attendanceClassSchema,
  attendanceSessionSchema,
  startAttendanceSessionSchema,
  submitAttendanceChallengeSchema,
} from "@/lib/validation/attendance";
import {
  closeAttendanceSessionServer,
  getActiveAttendanceSessionForStudentServer,
  getActiveAttendanceSessionServer,
  startAttendanceSessionServer,
  submitAttendanceChallengeServer,
} from "@/server/attendance.server";

export const startAttendanceSession = createServerFn({ method: "POST" })
  .validator(startAttendanceSessionSchema)
  .handler(({ data }) => startAttendanceSessionServer(data));

export const closeAttendanceSession = createServerFn({ method: "POST" })
  .validator(attendanceSessionSchema)
  .handler(({ data }) => closeAttendanceSessionServer(data.attendanceSessionId));

export const getActiveAttendanceSession = createServerFn({ method: "GET" })
  .validator(attendanceClassSchema)
  .handler(({ data }) => getActiveAttendanceSessionServer(data.classOfferingId));

export const getActiveAttendanceSessionForStudent = createServerFn({ method: "GET" })
  .validator(attendanceClassSchema)
  .handler(({ data }) => getActiveAttendanceSessionForStudentServer(data.classOfferingId));

export const submitAttendanceChallenge = createServerFn({ method: "POST" })
  .validator(submitAttendanceChallengeSchema)
  .handler(({ data }) => submitAttendanceChallengeServer(data));
