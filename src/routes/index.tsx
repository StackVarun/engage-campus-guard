import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarClock,
  CheckCircle2,
  Flame,
  MapPin,
  ScanLine,
  Sparkles,
  Timer,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";

import { StatCard } from "@/components/StatCard";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { freeSlots, student, todaySchedule } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Student Dashboard — PresenceOS" },
      {
        name: "description",
        content:
          "Today's classes, live attendance check-in, structured free time and XP progress for the semester at a glance.",
      },
      { property: "og:title", content: "Student Dashboard — PresenceOS" },
      {
        property: "og:description",
        content: "Live class status, 30-second check-in, free-slot plans and XP progress in one view.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const live = todaySchedule.find((s) => s.status === "live");
  const nextFree = freeSlots[0];
  const levelProgress = Math.round((1 - student.xpToNextLevel / 1200) * 100);

  return (
    <div className="space-y-10">
      <section className="surface-card relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Good afternoon, {student.name.split(" ")[0]}
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-tight sm:text-5xl">
              Mark attendance in <span className="text-gradient-signal">under 30 seconds</span>.
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              Dynamic QR rotates every 8 seconds, your location is geofenced to the room, and a liveness
              selfie confirms it is really you — proxy attendance simply cannot happen.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/attendance">
                  <ScanLine className="h-4 w-4" /> Check in now
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link to="/assistant">
                  <Sparkles className="h-4 w-4" /> Ask the AI tutor
                </Link>
              </Button>
            </div>
          </div>

          {live ? (
            <div className="rounded-2xl border border-primary/40 bg-primary/5 p-5">
              <div className="flex items-center gap-2">
                <span className="relative grid h-2.5 w-2.5 place-items-center">
                  <span className="absolute h-2.5 w-2.5 rounded-full bg-primary animate-pulse-ring" />
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Session live
                </span>
              </div>
              <h3 className="mt-3 font-display text-xl font-semibold">{live.title}</h3>
              <p className="text-sm text-muted-foreground">
                {live.code} · {live.faculty}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-secondary/60 p-3">
                  <dt className="text-xs text-muted-foreground">Room</dt>
                  <dd className="mt-0.5 flex items-center gap-1.5 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-accent" /> {live.room}
                  </dd>
                </div>
                <div className="rounded-xl bg-secondary/60 p-3">
                  <dt className="text-xs text-muted-foreground">Window closes</dt>
                  <dd className="mt-0.5 flex items-center gap-1.5 font-medium">
                    <Timer className="h-3.5 w-3.5 text-warning" /> 3m 20s
                  </dd>
                </div>
              </dl>
              <Button asChild className="mt-4 w-full">
                <Link to="/attendance">Verify presence</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CheckCircle2} label="Attendance" value={`${student.attendancePct}%`} sub="Semester aggregate" tone="primary" />
        <StatCard icon={Flame} label="Streak" value={`${student.streak} days`} sub="Personal best: 21" tone="accent" />
        <StatCard icon={Zap} label="XP" value={student.xp.toLocaleString()} sub={`Level ${student.level}`} tone="xp" />
        <StatCard icon={TrendingUp} label="Cohort rank" value={`#${student.rank}`} sub={`of ${student.cohortSize} students`} />
      </section>

      <section className="surface-card rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold">Level {student.level} → {student.level + 1}</h3>
            <p className="text-sm text-muted-foreground">{student.xpToNextLevel} XP to the next milestone badge</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/rewards">
              <Trophy className="h-4 w-4" /> View rewards
            </Link>
          </Button>
        </div>
        <Progress value={levelProgress} className="mt-4 h-2.5" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <SectionHeader eyebrow="Today" title="Class schedule" description="Parsed automatically from the institutional timetable." />
          <ul className="space-y-2">
            {todaySchedule.map((slot) => (
              <li
                key={slot.id}
                className={`surface-card flex flex-wrap items-center gap-4 rounded-xl px-4 py-3 ${
                  slot.status === "live" ? "border-primary/50" : ""
                }`}
              >
                <span className="w-24 font-mono text-sm text-muted-foreground">
                  {slot.start}–{slot.end}
                </span>
                <div className="min-w-40 flex-1">
                  <p className="font-medium">{slot.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {slot.code} · {slot.room} · {slot.faculty}
                  </p>
                </div>
                {slot.status === "done" ? (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Present
                  </Badge>
                ) : slot.status === "live" ? (
                  <Badge className="bg-primary text-primary-foreground">Live now</Badge>
                ) : (
                  <Badge variant="outline">Upcoming</Badge>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <SectionHeader eyebrow="Free time" title="Next open block" />
          {nextFree ? (
            <div className="surface-card rounded-2xl p-5">
              <div className="flex items-center gap-2 text-accent">
                <CalendarClock className="h-4 w-4" />
                <span className="font-mono text-sm">
                  {nextFree.start}–{nextFree.end}
                </span>
                <span className="text-xs text-muted-foreground">· {nextFree.minutes} min free</span>
              </div>
              <ul className="mt-4 space-y-3">
                {nextFree.suggestions.slice(0, 2).map((s) => (
                  <li key={s.title} className="rounded-xl bg-secondary/50 p-3">
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{s.reason}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <Badge variant="outline">{s.minutes} min</Badge>
                      <Badge className="bg-xp text-xp-foreground">+{s.xp} XP</Badge>
                    </div>
                  </li>
                ))}
              </ul>
              <Button asChild variant="secondary" className="mt-4 w-full">
                <Link to="/timetable">Plan this block</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
