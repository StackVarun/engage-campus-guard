export type UserRole = "STUDENT" | "FACULTY";

export type StudentProfile = {
  userId: string;
  fullName: string;
  rollNumber: string;
  department: string | null;
  semester: number | null;
  section: string | null;
};

export type FacultyProfile = {
  userId: string;
  fullName: string;
  employeeNumber: string | null;
  department: string | null;
};

type BaseUser = {
  id: string;
  email: string;
};

export type StudentUser = BaseUser & {
  role: "STUDENT";
  profile: StudentProfile | null;
};

export type FacultyUser = BaseUser & {
  role: "FACULTY";
  profile: FacultyProfile | null;
};

export type CurrentUser = StudentUser | FacultyUser;

/*
 * Keep these guards explicit so role and profile fields remain correlated in
 * both server functions and client components.
 */
export function isStudent(user: CurrentUser | null): user is StudentUser {
  return user?.role === "STUDENT";
}

export function isFaculty(user: CurrentUser | null): user is FacultyUser {
  return user?.role === "FACULTY";
}
