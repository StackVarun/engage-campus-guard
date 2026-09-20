import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, GraduationCap, ScanLine, Sparkles, Trophy, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SectionHeader } from "@/components/SectionHeader";
import { StatCard } from "@/components/StatCard";
import { requireRouteRole } from "@/lib/auth/route-guards";
import { getMyClasses, type ClassSummary } from "@/lib/api/classes.functions";

export const Route = createFileRoute("/")({
  beforeLoad: () => requireRouteRole("STUDENT"),
  loader: async () => {
    const user = await requireRouteRole("STUDENT");
    const classes = await getMyClasses();
    return { user, classes };
  },
  head: () => ({
    meta: [
      { title: "Student Dashboard · SCAAP" },
      {
        name: "description",
        content: "Your authenticated SCAAP student dashboard and enrolled classes.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, classes } = Route.useLoaderData();
  const profile = user.profile && "rollNumber" in user.profile ? user.profile : null;
  const firstName = profile?.fullName.split(" ")[0] ?? user.email.split("@")[0];

  return (
    <div className="space-y-10">
      <section className="surface-card relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Welcome back, {firstName}
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-tight sm:text-5xl">
              Your SCAAP <span className="text-gradient-signal">student workspace</span>.
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              Your account and enrollment foundation is connected. Attendance, planning, rewards,
              and AI features will build on it in later phases.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/attendance">
                  <ScanLine className="h-4 w-4" /> Attendance preview
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link to="/assistant">
                  <Sparkles className="h-4 w-4" /> AI tutor preview
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-5">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                Authenticated student
              </span>
            </div>
            <h3 className="mt-3 font-display text-xl font-semibold">
              {profile?.fullName ?? user.email}
            </h3>
            <p className="text-sm text-muted-foreground">
              {profile?.rollNumber ?? "Profile details pending"}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-secondary/60 p-3">
                <dt className="text-xs text-muted-foreground">Department</dt>
                <dd className="mt-0.5 font-medium">{profile?.department ?? "Not set"}</dd>
              </div>
              <div className="rounded-xl bg-secondary/60 p-3">
                <dt className="text-xs text-muted-foreground">Section</dt>
                <dd className="mt-0.5 font-medium">{profile?.section ?? "Not set"}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CheckCircle2}
          label="Attendance"
          value="—"
          sub="Available in Phase 2"
          tone="primary"
        />
        <StatCard
          icon={Users}
          label="Enrolled classes"
          value={String(classes.length)}
          sub="Current account scope"
          tone="accent"
        />
        <StatCard icon={Trophy} label="XP" value="0" sub="Available in a later phase" tone="xp" />
        <StatCard icon={GraduationCap} label="Role" value="Student" sub="Server-authorized" />
      </section>

      <section className="surface-card rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold">Foundation progress</h3>
            <p className="text-sm text-muted-foreground">
              Authentication, profiles, classes, and enrollment are now the source of truth.
            </p>
          </div>
          <Badge variant="secondary">Phase 1</Badge>
        </div>
        <Progress value={100} className="mt-4 h-2.5" />
      </section>

      <section className="space-y-4">
        <SectionHeader
          eyebrow="Academic foundation"
          title="My enrolled classes"
          description="Only classes associated with the authenticated student are loaded from the server."
        />
        {classes.length > 0 ? (
          <ul className="space-y-2">
            {classes.map((classOffering) => (
              <ClassRow key={classOffering.id} classOffering={classOffering} />
            ))}
          </ul>
        ) : (
          <div className="surface-card rounded-2xl p-6 text-sm text-muted-foreground">
            You are not enrolled in any classes yet.
          </div>
        )}
      </section>
    </div>
  );
}

function ClassRow({ classOffering }: { classOffering: ClassSummary }) {
  return (
    <li className="surface-card flex flex-wrap items-center gap-4 rounded-xl px-4 py-3">
      <span className="w-24 font-mono text-sm text-muted-foreground">{classOffering.section}</span>
      <div className="min-w-40 flex-1">
        <p className="font-medium">{classOffering.courseName}</p>
        <p className="text-xs text-muted-foreground">
          {classOffering.courseCode} · {classOffering.academicYear} · {classOffering.term}
        </p>
      </div>
      <Badge variant="secondary" className="gap-1">
        <CheckCircle2 className="h-3 w-3" /> Enrolled
      </Badge>
    </li>
  );
}
