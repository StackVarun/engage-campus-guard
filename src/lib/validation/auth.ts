import { z } from "zod";

export const credentialsSchema = z
  .object({
    email: z.string().trim().email().max(320),
    password: z.string().min(1).max(128),
  })
  .strict();

export const studentRegistrationSchema = z
  .object({
    email: z.string().trim().email().max(320),
    password: z.string().min(8).max(128),
    fullName: z.string().trim().min(2).max(120),
    rollNumber: z.string().trim().min(2).max(40),
  })
  .strict();
