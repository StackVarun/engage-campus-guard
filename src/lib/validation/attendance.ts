import { z } from "zod";

const uuid = z.string().uuid();

export const startAttendanceSessionSchema = z
  .object({
    classOfferingId: uuid,
    durationSeconds: z.number().int().min(30).max(3600).default(300),
  })
  .strict();

export const attendanceSessionSchema = z.object({ attendanceSessionId: uuid }).strict();

export const attendanceClassSchema = z.object({ classOfferingId: uuid }).strict();

export const submitAttendanceChallengeSchema = z
  .object({
    attendanceSessionId: uuid,
    challengeToken: uuid,
  })
  .strict();
