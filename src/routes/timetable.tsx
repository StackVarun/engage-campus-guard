import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, CalendarDays, Clock, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { SectionHeader } from "@/components/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMyClasses } from "@/lib/api/classes.functions";
import {
  createAcademicSuggestions,
  detectFreePeriods,
  type StudySubject,
} from "@/lib/academic-intelligence";
import { requireRouteRole } from "@/lib/auth/route-guards";
import { todaySchedule } from "@/lib/mock-data";

export const Route = createFileRoute("/timetable")({
  beforeLoad: () => requireRouteRole("STUDENT"),
  loader: async () => ({ classes: await getMyClasses() }),
  head: () => ({
    meta: [
      { title: "Free Time Planner — PresenceOS" },
      {
        name: "description",
        content:
          "Use today's timetable to find free periods and turn them into focused academic study blocks.",
      },
      { property: "og:title", content: "Free Time Planner — PresenceOS" },
      {
        property: "og:description",
        content: "Find the gaps between classes and choose a focused study activity for each one.",
      },
    ],
  }),
  component: TimetablePage,
});

function TimetablePage() {
  const { classes } = Route.useLoaderData();
  const enrolledSubjects: StudySubject[] = classes.map((classOffering) => ({
    code: classOffering.courseCode,
    name: classOffering.courseName,
  }));
  const timetableSubjects: StudySubject[] = todaySchedule.map((classSlot) => ({
    code: classSlot.code,
    name: classSlot.title,
  }));
  const studySubjects = enrolledSubjects.length > 0 ? enrolledSubjects : timetableSubjects;
  const freePeriods = createAcademicSuggestions(detectFreePeriods(todaySchedule), studySubjects);
  const totalFree = freePeriods.reduce((sum, period) => sum + period.minutes, 0);

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Structured free time"
        title="Turn gaps into progress"
        description="Today's timetable is checked for meaningful gaps. Each gap gets one deterministic study suggestion based on your enrolled courses."
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              toast.info("Timetable checked", {
                description: `${freePeriods.length} free period${freePeriods.length === 1 ? "" : "s"} detected today`,
              })
            }
          >
            <CalendarClock className="h-4 w-4" /> Check timetable
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="surface-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Free today</p>
          <p className="mt-2 font-display text-3xl font-semibold text-accent">{totalFree} min</p>
        </div>
        <div className="surface-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Useful gaps</p>
          <p className="mt-2 font-display text-3xl font-semibold text-primary">
            {freePeriods.length}
          </p>
        </div>
        <div className="surface-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Classes today</p>
          <p className="mt-2 font-display text-3xl font-semibold">{todaySchedule.length}</p>
        </div>
      </div>

      <section className="space-y-4">
        <SectionHeader
          eyebrow="Today's timetable"
          title="Scheduled classes"
          description="Your existing timetable supplies the schedule; enrolled courses supply the subjects used for study suggestions."
        />
        <div className="grid gap-3 md:grid-cols-2">
          {todaySchedule.map((slot) => (
            <div key={slot.id} className="surface-card flex items-center gap-4 rounded-xl p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{slot.title}</p>
                <p className="text-xs text-muted-foreground">
                  {slot.code} · {slot.room} · {slot.start}–{slot.end}
                </p>
              </div>
              <Badge variant={slot.status === "live" ? "default" : "secondary"}>
                {slot.status}
              </Badge>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          eyebrow="Detected free periods"
          title="Study suggestions"
          description="Free periods include time before the first class, gaps between classes, and time after the last class."
        />
        {freePeriods.length > 0 ? (
          <div className="space-y-6">
            {freePeriods.map((period) => (
              <div key={period.id} className="surface-card rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent">
                      <CalendarClock className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-display text-lg font-semibold">
                        {period.start} – {period.end}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {period.minutes} minutes of open time
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <Sparkles className="h-3 w-3" /> Academic suggestion
                  </Badge>
                </div>

                <div className="mt-5 rounded-xl border border-border bg-secondary/40 p-4">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {period.suggestion.kind}
                  </p>
                  <p className="mt-1 font-medium leading-snug">{period.suggestion.title}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{period.suggestion.reason}</p>
                  <Badge variant="outline" className="mt-3 gap-1">
                    <Clock className="h-3 w-3" /> {period.suggestion.minutes}m focus
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="surface-card rounded-2xl p-6 text-sm text-muted-foreground">
            No meaningful free periods were found in today's timetable.
          </div>
        )}
      </section>
    </div>
  );
}
