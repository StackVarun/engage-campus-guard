import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Building2, GraduationCap, Users } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/SectionHeader";
import { StatCard } from "@/components/StatCard";
import {
  closeAttendanceSession,
  getActiveAttendanceSession,
  startAttendanceSession,
} from "@/lib/api/attendance.functions";
import { requireRouteRole } from "@/lib/auth/route-guards";
import { getMyFacultyClasses, type ClassSummary } from "@/lib/api/classes.functions";

export const Route = createFileRoute("/faculty")({
  beforeLoad: () => requireRouteRole("FACULTY"),
  loader: async () => {
    const user = await requireRouteRole("FACULTY");
    const classes = await getMyFacultyClasses();
    return { user, classes };
  },
  head: () => ({
    meta: [
      { title: "Faculty Workspace · SCAAP" },
      {
        name: "description",
        content: "Authenticated faculty classes and ownership foundation for SCAAP.",
      },
    ],
  }),
  component: FacultyPage,
});

function FacultyPage() {
  const { user, classes } = Route.useLoaderData();
  const profile = user.profile && "employeeNumber" in user.profile ? user.profile : null;

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Faculty workspace"
        title={`Welcome, ${profile?.fullName ?? user.email}`}
        description="Only classes assigned to the authenticated faculty account are loaded here. Attendance sessions and analytics arrive in later phases."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={GraduationCap}
          label="Role"
          value="Faculty"
          sub="Server-authorized"
          tone="primary"
        />
        <StatCard
          icon={BookOpen}
          label="Assigned classes"
          value={String(classes.length)}
          sub="Current account scope"
          tone="accent"
        />
        <StatCard icon={Users} label="Attendance" value="—" sub="Available in Phase 2" />
        <StatCard
          icon={Building2}
          label="Analytics"
          value="—"
          sub="Available in a later phase"
          tone="xp"
        />
      </div>

      <section className="space-y-4">
        <SectionHeader
          eyebrow="Ownership boundary"
          title="My class offerings"
          description="Server-side authorization derives faculty ownership from the authenticated Supabase user."
        />
        {classes.length > 0 ? (
          <ul className="grid gap-4 md:grid-cols-2">
            {classes.map((classOffering) => (
              <ClassCard key={classOffering.id} classOffering={classOffering} />
            ))}
          </ul>
        ) : (
          <div className="surface-card rounded-2xl p-6 text-sm text-muted-foreground">
            No class offerings have been assigned to this faculty account yet.
          </div>
        )}
      </section>
    </div>
  );
}

function ClassCard({ classOffering }: { classOffering: ClassSummary }) {
  const getActiveSession = useServerFn(getActiveAttendanceSession);
  const startSession = useServerFn(startAttendanceSession);
  const closeSession = useServerFn(closeAttendanceSession);
  const [attendanceSession, setAttendanceSession] = useState<AttendanceSessionView | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [pendingAction, setPendingAction] = useState<"start" | "close" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAttendanceSession = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoadingSession(true);
      setErrorMessage(null);

      try {
        const session = await getActiveSession({ data: { classOfferingId: classOffering.id } });
        setAttendanceSession(toAttendanceSessionView(session));
      } catch (error) {
        setErrorMessage(getAttendanceErrorMessage(error, "Unable to load attendance status."));
      } finally {
        if (showLoading) setLoadingSession(false);
      }
    },
    [classOffering.id, getActiveSession],
  );

  useEffect(() => {
    void loadAttendanceSession();
  }, [loadAttendanceSession]);

  useEffect(() => {
    if (!attendanceSession) return;

    const remainingMilliseconds = new Date(attendanceSession.expiresAt).getTime() - Date.now();
    const timeout = window.setTimeout(
      () => {
        void loadAttendanceSession(false);
      },
      Math.max(remainingMilliseconds, 0),
    );

    return () => window.clearTimeout(timeout);
  }, [attendanceSession, loadAttendanceSession]);

  async function handleStartAttendance() {
    setPendingAction("start");
    setErrorMessage(null);

    try {
      const session = await startSession({
        data: {
          classOfferingId: classOffering.id,
          durationSeconds: 300,
        },
      });
      setAttendanceSession(toAttendanceSessionView(session));
    } catch (error) {
      setErrorMessage(getAttendanceErrorMessage(error, "Unable to start attendance session."));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleCloseAttendance() {
    if (!attendanceSession) return;

    setPendingAction("close");
    setErrorMessage(null);

    try {
      await closeSession({ data: { attendanceSessionId: attendanceSession.id } });
      await loadAttendanceSession(false);
    } catch (error) {
      setErrorMessage(getAttendanceErrorMessage(error, "Unable to close attendance session."));
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <li className="surface-card rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {classOffering.courseCode}
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold">{classOffering.courseName}</h3>
        </div>
        <Badge variant="secondary">Section {classOffering.section}</Badge>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-secondary/60 p-3">
          <dt className="text-xs text-muted-foreground">Academic year</dt>
          <dd className="mt-0.5 font-medium">{classOffering.academicYear}</dd>
        </div>
        <div className="rounded-xl bg-secondary/60 p-3">
          <dt className="text-xs text-muted-foreground">Term</dt>
          <dd className="mt-0.5 font-medium">{classOffering.term}</dd>
        </div>
      </dl>
      <p className="mt-4 text-sm text-muted-foreground">
        Room: {classOffering.roomName ?? "Not assigned"}
      </p>
      <div className="mt-5 border-t border-border/70 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Attendance session
            </p>
            {loadingSession ? (
              <p className="mt-1 text-sm text-muted-foreground">Checking session status...</p>
            ) : attendanceSession ? (
              <p className="mt-1 text-sm font-medium text-primary">Active</p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">No active session</p>
            )}
          </div>
          {attendanceSession ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pendingAction !== null}
              onClick={() => void handleCloseAttendance()}
            >
              {pendingAction === "close" ? "Closing..." : "Close session"}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={loadingSession || pendingAction !== null}
              onClick={() => void handleStartAttendance()}
            >
              {pendingAction === "start" ? "Starting..." : "Start attendance"}
            </Button>
          )}
        </div>
        {attendanceSession ? (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Active until {formatAttendanceExpiration(attendanceSession.expiresAt)}
            </p>
            {attendanceSession.challengeToken ? (
              <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-4">
                <QRCodeSVG
                  value={JSON.stringify({
                    attendanceSessionId: attendanceSession.id,
                    challengeToken: attendanceSession.challengeToken,
                  })}
                  size={192}
                  level="M"
                  includeMargin
                  aria-label="Attendance challenge QR code"
                />
                <p className="text-center text-sm text-muted-foreground">
                  Scan this QR code to mark attendance.
                </p>
              </div>
            ) : (
              <p className="text-sm text-destructive" role="alert">
                The attendance QR code is unavailable for this session.
              </p>
            )}
          </div>
        ) : null}
        {errorMessage ? (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </li>
  );
}

type AttendanceSessionView = {
  id: string;
  status: "ACTIVE" | "CLOSED";
  startedAt: string;
  expiresAt: string;
  closedAt: string | null;
  challengeToken: string | null;
};

function toAttendanceSessionView(
  session: {
    id: string;
    status: "ACTIVE" | "CLOSED";
    startedAt: string;
    expiresAt: string;
    closedAt: string | null;
    challenge?: { token: string } | null;
  } | null,
): AttendanceSessionView | null {
  if (!session) return null;

  return {
    id: session.id,
    status: session.status,
    startedAt: session.startedAt,
    expiresAt: session.expiresAt,
    closedAt: session.closedAt,
    challengeToken: session.challenge?.token ?? null,
  };
}

function formatAttendanceExpiration(expiresAt: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(expiresAt));
}

function getAttendanceErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
