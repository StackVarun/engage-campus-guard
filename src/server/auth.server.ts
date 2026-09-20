import type { CurrentUser, FacultyProfile, StudentProfile, UserRole } from "@/lib/auth/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { assertRole } from "./authorization";
import { AppError } from "./errors";

type UserAccountRow = {
  id: string;
  email: string;
  role: UserRole;
};

type StudentProfileRow = {
  user_id: string;
  full_name: string;
  roll_number: string;
  department: string | null;
  semester: number | null;
  section: string | null;
};

type FacultyProfileRow = {
  user_id: string;
  full_name: string;
  employee_number: string | null;
  department: string | null;
};

function toStudentProfile(row: StudentProfileRow): StudentProfile {
  return {
    userId: row.user_id,
    fullName: row.full_name,
    rollNumber: row.roll_number,
    department: row.department,
    semester: row.semester,
    section: row.section,
  };
}

function toFacultyProfile(row: FacultyProfileRow): FacultyProfile {
  return {
    userId: row.user_id,
    fullName: row.full_name,
    employeeNumber: row.employee_number,
    department: row.department,
  };
}

export async function getCurrentUserServer(
  supabase: SupabaseClient = getSupabaseServerClient(),
): Promise<CurrentUser | null> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data: account, error: accountError } = await supabase
    .from("user_accounts")
    .select("id, email, role")
    .eq("id", user.id)
    .maybeSingle();

  if (accountError) {
    console.error(accountError);
    throw new AppError(500, "ACCOUNT_LOOKUP_FAILED", "Unable to load the current account");
  }

  if (!account) return null;

  const typedAccount = account as UserAccountRow;
  if (typedAccount.role !== "STUDENT" && typedAccount.role !== "FACULTY") {
    throw new AppError(500, "INVALID_ACCOUNT_ROLE", "The account has an invalid role");
  }

  if (typedAccount.role === "STUDENT") {
    const { data: profile, error: profileError } = await supabase
      .from("student_profiles")
      .select("user_id, full_name, roll_number, department, semester, section")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(profileError);
      throw new AppError(500, "PROFILE_LOOKUP_FAILED", "Unable to load the student profile");
    }

    if (!profile) return null;

    return {
      id: typedAccount.id,
      email: typedAccount.email,
      role: typedAccount.role,
      profile: profile ? toStudentProfile(profile as StudentProfileRow) : null,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("faculty_profiles")
    .select("user_id, full_name, employee_number, department")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(profileError);
    throw new AppError(500, "PROFILE_LOOKUP_FAILED", "Unable to load the faculty profile");
  }

  if (!profile) return null;

  return {
    id: typedAccount.id,
    email: typedAccount.email,
    role: typedAccount.role,
    profile: profile ? toFacultyProfile(profile as FacultyProfileRow) : null,
  };
}

export async function requireAuthenticatedUser(): Promise<CurrentUser> {
  const user = await getCurrentUserServer();
  if (!user) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication is required");
  }
  return user;
}

export async function requireRole(role: UserRole): Promise<CurrentUser> {
  const user = await requireAuthenticatedUser();
  return assertRole(user, role);
}
