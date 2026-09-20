import { z } from "zod";

export const courseSchema = z
  .object({
    code: z.string().trim().min(2).max(20),
    name: z.string().trim().min(2).max(120),
    credits: z.number().int().min(1).max(10).nullable().optional(),
  })
  .strict();

export const classOfferingSchema = z
  .object({
    courseId: z.string().uuid(),
    section: z.string().trim().min(1).max(20),
    roomLocationId: z.string().uuid().nullable().optional(),
    academicYear: z.string().trim().min(4).max(20),
    term: z.string().trim().min(1).max(40),
  })
  .strict();

export const enrollmentSchema = z.object({ classOfferingId: z.string().uuid() }).strict();
