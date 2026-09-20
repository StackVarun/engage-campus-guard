import { createFileRoute } from "@tanstack/react-router";
import { Scanner, type IDetectedBarcode, type IScannerError } from "@yudiel/react-qr-scanner";
import { AlertCircle, CheckCircle2, Clock3, RefreshCw, ScanLine } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/SectionHeader";
import {
  getActiveAttendanceSessionForStudent,
  submitAttendanceChallenge,
} from "@/lib/api/attendance.functions";
import { getMyClasses, type ClassSummary } from "@/lib/api/classes.functions";
import { requireRouteRole } from "@/lib/auth/route-guards";
import { submitAttendanceChallengeSchema } from "@/lib/validation/attendance";

export const Route = createFileRoute("/attendance")({
  beforeLoad: () => requireRouteRole("STUDENT"),
  loader: async () => {
    await requireRouteRole("STUDENT");
    return { classes: await getMyClasses() };
  },
  head: () => ({
    meta: [
      { title: "Attendance · SCAAP" },
      {
        name: "description",
        content: "Live attendance session status for your enrolled classes.",
      },
    ],
  }),
  component: AttendancePage,
});

type AttendanceSessionState =
  | { status: "loading" }
  | { status: "active"; sessionId: string; expiresAt: string }
  | { status: "inactive" }
  | { status: "error"; message: string };

function AttendancePage() {
  const { classes } = Route.useLoaderData();
  const getActiveSession = useServerFn(getActiveAttendanceSessionForStudent);
  const [sessionStates, setSessionStates] = useState<Record<string, AttendanceSessionState>>(() =>
    createLoadingStates(classes),
  );
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const loadAttendanceSessions = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setLoading(true);
        setSessionStates(createLoadingStates(classes));
      }
      setPageError(null);

      const results = await Promise.all(
        classes.map(async (classOffering) => {
          try {
            const session = await getActiveSession({
              data: { classOfferingId: classOffering.id },
            });

            return {
              classOfferingId: classOffering.id,
              state: session
                ? ({
                    status: "active",
                    sessionId: session.id,
                    expiresAt: session.expiresAt,
                  } as const)
                : ({ status: "inactive" } as const),
            };
          } catch (error) {
            return {
              classOfferingId: classOffering.id,
              state: {
                status: "error",
                message: getAttendanceErrorMessage(
                  error,
                  "Unable to load attendance status for this class.",
                ),
              } as const,
            };
          }
        }),
      );

      setSessionStates(
        Object.fromEntries(results.map(({ classOfferingId, state }) => [classOfferingId, state])),
      );

      const failedClasses = results.filter((result) => result.state.status === "error");
      const firstFailedState = failedClasses[0]?.state;
      if (failedClasses.length > 0) {
        setPageError(
          failedClasses.length === 1
            ? firstFailedState?.status === "error"
              ? firstFailedState.message
              : null
            : "Unable to load attendance status for one or more classes.",
        );
      }

      if (showLoading) setLoading(false);
    },
    [classes, getActiveSession],
  );

  useEffect(() => {
    void loadAttendanceSessions();
  }, [loadAttendanceSessions]);

  useEffect(() => {
    const activeExpirations = Object.values(sessionStates)
      .filter(
        (state): state is { status: "active"; sessionId: string; expiresAt: string } =>
          state.status === "active",
      )
      .map((state) => new Date(state.expiresAt).getTime())
      .filter((time) => Number.isFinite(time));

    if (activeExpirations.length === 0) return;

    const nextExpiration = Math.min(...activeExpirations);
    const timeout = window.setTimeout(
      () => void loadAttendanceSessions(false),
      Math.max(nextExpiration - Date.now(), 0) + 50,
    );

    return () => window.clearTimeout(timeout);
  }, [loadAttendanceSessions, sessionStates]);

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Live class status"
        title="Attendance"
        description="See whether an attendance session is currently active for each enrolled class."
        action={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => void loadAttendanceSessions()}
          >
            <RefreshCw className="h-4 w-4" />
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        }
      />

      {pageError ? (
        <div
          className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{pageError}</span>
        </div>
      ) : null}

      {classes.length === 0 ? (
        <div className="surface-card rounded-2xl p-6 text-sm text-muted-foreground">
          You are not enrolled in any classes yet.
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {classes.map((classOffering) => (
            <AttendanceClassCard
              key={classOffering.id}
              classOffering={classOffering}
              state={sessionStates[classOffering.id] ?? { status: "loading" }}
              onRefresh={() => loadAttendanceSessions(false)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function AttendanceClassCard({
  classOffering,
  state,
  onRefresh,
}: {
  classOffering: ClassSummary;
  state: AttendanceSessionState;
  onRefresh: () => Promise<void>;
}) {
  const submitChallenge = useServerFn(submitAttendanceChallenge);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSessionId, setSubmittedSessionId] = useState<string | null>(null);
  const activeSessionId = state.status === "active" ? state.sessionId : null;
  const attendanceRecorded = activeSessionId !== null && submittedSessionId === activeSessionId;

  useEffect(() => {
    setScannerOpen(false);
    setScannerError(null);
    setSubmitting(false);
  }, [activeSessionId]);

  const handleScan = useCallback(
    async (detectedCodes: IDetectedBarcode[]) => {
      if (!activeSessionId || submitting || attendanceRecorded) return;

      const rawValue = detectedCodes.find((code) => code.rawValue)?.rawValue;
      if (!rawValue) {
        setScannerError("The QR code did not contain an attendance payload.");
        return;
      }

      let decodedPayload: unknown;
      try {
        decodedPayload = JSON.parse(rawValue) as unknown;
      } catch {
        setScannerError("That QR code is not valid attendance data.");
        return;
      }

      const parsedPayload = submitAttendanceChallengeSchema.safeParse(decodedPayload);
      if (!parsedPayload.success) {
        setScannerError("That QR code is missing valid attendance information.");
        return;
      }

      if (parsedPayload.data.attendanceSessionId !== activeSessionId) {
        setScannerError("That QR code belongs to a different attendance session.");
        return;
      }

      setSubmitting(true);
      setScannerError(null);

      try {
        await submitChallenge({ data: parsedPayload.data });
        setSubmittedSessionId(activeSessionId);
        setScannerOpen(false);
      } catch (error) {
        const message = getAttendanceErrorMessage(error, "Unable to mark attendance.");
        setScannerError(message);

        if (isAttendanceAlreadyRecordedMessage(message)) {
          setSubmittedSessionId(activeSessionId);
          setScannerOpen(false);
        } else if (isAttendanceEndedMessage(message)) {
          setScannerOpen(false);
          await onRefresh();
        }
      } finally {
        setSubmitting(false);
      }
    },
    [activeSessionId, attendanceRecorded, onRefresh, submitChallenge, submitting],
  );

  function handleScannerError(error: IScannerError) {
    setScannerOpen(false);
    setScannerError(getScannerErrorMessage(error));
  }

  function openScanner() {
    setScannerError(null);
    setScannerOpen(true);
  }

  return (
    <li className="surface-card rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {classOffering.courseCode}
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold">{classOffering.courseName}</h2>
        </div>
        <Badge variant="secondary">Section {classOffering.section}</Badge>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        {classOffering.academicYear} · {classOffering.term}
      </p>

      <div className="mt-5 border-t border-border/70 pt-4">
        {state.status === "loading" ? (
          <p className="text-sm text-muted-foreground">Checking attendance status...</p>
        ) : state.status === "active" ? (
          <div className="space-y-2">
            <Badge variant="secondary" className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Attendance active
            </Badge>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock3 className="h-4 w-4" />
              Active until {formatAttendanceExpiration(state.expiresAt)}
            </p>
            {attendanceRecorded ? (
              <Badge variant="secondary" className="gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Attendance recorded
              </Badge>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={submitting}
                    onClick={scannerOpen ? () => setScannerOpen(false) : openScanner}
                  >
                    <ScanLine className="h-4 w-4" />
                    {scannerOpen ? "Stop scanning" : "Scan QR / mark attendance"}
                  </Button>
                  {submitting ? (
                    <p className="self-center text-sm text-muted-foreground">
                      Marking attendance...
                    </p>
                  ) : null}
                </div>
                {scannerOpen ? (
                  <div className="overflow-hidden rounded-xl border border-border/70 bg-black">
                    <Scanner
                      onScan={handleScan}
                      onError={handleScannerError}
                      constraints={{ facingMode: "environment" }}
                      styles={{
                        container: { width: "100%" },
                        video: { width: "100%", aspectRatio: "1 / 1", objectFit: "cover" },
                      }}
                    />
                  </div>
                ) : null}
              </div>
            )}
            {scannerError ? (
              <p className="text-sm text-destructive" role="alert">
                {scannerError}
              </p>
            ) : null}
          </div>
        ) : state.status === "inactive" ? (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ScanLine className="h-4 w-4" />
            No active session
          </p>
        ) : (
          <p className="text-sm text-destructive">{state.message}</p>
        )}
      </div>
    </li>
  );
}

function createLoadingStates(classes: ClassSummary[]): Record<string, AttendanceSessionState> {
  return Object.fromEntries(
    classes.map((classOffering) => [classOffering.id, { status: "loading" }]),
  ) as Record<string, AttendanceSessionState>;
}

function formatAttendanceExpiration(expiresAt: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(expiresAt));
}

function getScannerErrorMessage(error: IScannerError): string {
  switch (error.kind) {
    case "permission-denied":
      return "Camera permission was denied. Allow camera access and try again.";
    case "no-camera":
      return "No camera is available on this device.";
    case "in-use":
      return "The camera is already being used by another application.";
    case "insecure-context":
      return "Camera access requires HTTPS or localhost.";
    case "unsupported":
      return "This browser does not support camera QR scanning.";
    default:
      return "Unable to start the camera. Check camera access and try again.";
  }
}

function isAttendanceAlreadyRecordedMessage(message: string): boolean {
  return /already been recorded/i.test(message);
}

function isAttendanceEndedMessage(message: string): boolean {
  return /expired|closed|not active/i.test(message);
}

function getAttendanceErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
