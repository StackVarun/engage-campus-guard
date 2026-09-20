import { createServerFn } from "@tanstack/react-start";

import type { UserRole } from "@/lib/auth/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { classOfferingSchema, courseSchema, enrollmentSchema } from "@/lib/validation/classes";
import { requireRole } from "@/server/auth.server";

export type ClassSummary = {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  facultyId: string;
  section: string;
  roomLocationId: string | null;
  roomName: string | null;
  academicYear: string;
  term: string;
};

type RelatedCourse = { id: string; code: string; name: string } | null;
type RelatedRoom = { id: string; name: string } | null;

type ClassRow = {
  id: string;
  course_id: string;
  faculty_id: string;
  section: string;
  room_location_id: string | null;
  academic_year: string;
  term: string;
  courses: RelatedCourse;
  room_locations: RelatedRoom;
};

function toClassSummary(row: ClassRow): ClassSummary {
  if (!row.courses) {
    throw new Error("Class offering has no course");
  }

  return {
    id: row.id,
    courseId: row.course_id,
    courseCode: row.courses.code,
    courseName: row.courses.name,
    facultyId: row.faculty_id,
    section: row.section,
    roomLocationId: row.room_location_id,
    roomName: row.room_locations?.name ?? null,
    academicYear: row.academic_year,
    term: row.term,
  };
}

const classSelect =
  "id, course_id, faculty_id, section, room_location_id, academic_year, term, courses(id, code, name), room_locations(id, name)";

async function getClassesForUser(userId: string, role: UserRole): Promise<ClassSummary[]> {
  const supabase = getSupabaseServerClient();

  if (role === "FACULTY") {
    const { data, error } = await supabase
      .from("class_offerings")
      .select(classSelect)
      .eq("faculty_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error("Unable to load faculty classes");
    return ((data ?? []) as unknown as ClassRow[]).map(toClassSummary);
  }

  const { data: enrollments, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("class_offering_id")
    .eq("student_id", userId);

  if (enrollmentError) throw new Error("Unable to load student enrollments");
  const offeringIds = (enrollments ?? []).map((row) => row.class_offering_id as string);
  if (offeringIds.length === 0) return [];

  const { data, error } = await supabase
    .from("class_offerings")
    .select(classSelect)
    .in("id", offeringIds)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Unable to load enrolled classes");
  return ((data ?? []) as unknown as ClassRow[]).map(toClassSummary);
}

export const getMyClasses = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireRole("STUDENT");
  return getClassesForUser(user.id, user.role);
});

export const createCourse = createServerFn({ method: "POST" })
  .validator(courseSchema)
  .handler(async ({ data }) => {
    await requireRole("FACULTY");
    const supabase = getSupabaseServerClient();
    const { data: course, error } = await supabase
      .from("courses")
      .insert({ code: data.code, name: data.name, credits: data.credits ?? null })
      .select("id, code, name, credits")
      .single();

    if (error) throw new Error("Unable to create course");
    return course;
  });

export const createClassOffering = createServerFn({ method: "POST" })
  .validator(classOfferingSchema)
  .handler(async ({ data }) => {
    const faculty = await requireRole("FACULTY");
    const supabase = getSupabaseServerClient();
    const { data: offering, error } = await supabase
      .from("class_offerings")
      .insert({
        course_id: data.courseId,
        faculty_id: faculty.id,
        section: data.section,
        room_location_id: data.roomLocationId ?? null,
        academic_year: data.academicYear,
        term: data.term,
      })
      .select(classSelect)
      .single();

    if (error) throw new Error("Unable to create class offering");
    return toClassSummary(offering as unknown as ClassRow);
  });

export const getMyFacultyClasses = createServerFn({ method: "GET" }).handler(async () => {
  const faculty = await requireRole("FACULTY");
  return getClassesForUser(faculty.id, faculty.role);
});

export const enrollInClass = createServerFn({ method: "POST" })
  .validator(enrollmentSchema)
  .handler(async ({ data }) => {
    const student = await requireRole("STUDENT");
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("enrollments").insert({
      student_id: student.id,
      class_offering_id: data.classOfferingId,
    });

    if (error) throw new Error("Unable to enroll in class");
    return { ok: true as const };
  });
