import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  MapPin,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Timer,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { todaySchedule } from "@/lib/mock-data";

export const Route = createFileRoute("/attendance")({
  head: () => ({
    meta: [
      { title: "Secure Check-in — PresenceOS" },
      {
        name: "description",
        content:
          "Three-factor attendance: rotating dynamic QR, room-level geofence and a liveness selfie, completed in under 30 seconds.",
      },
      { property: "og:title", content: "Secure Check-in — PresenceOS" },
      {
        property: "og:description",
        content: "Dynamic QR + geofencing + face match makes proxy attendance impossible.",
      },
    ],
  }),
  component: AttendancePage,
});

type Step = 0 | 1 | 2 | 3;

const QR_ROTATE_SECONDS = 8;

function randomToken() {
  return Array.from({ length: 4 }, () =>
    Math.random().toString(36).slice(2, 6).toUpperCase(),
  ).join("-");
}

function AttendancePage() {
  const live = todaySchedule.find((s) => s.status === "live") ?? todaySchedule[0]!;
  const [step, setStep] = useState<Step>(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [token, setToken] = useState("LOADING-QR-CODE");
  const [ttl, setTtl] = useState(QR_ROTATE_SECONDS);
  const [geoState, setGeoState] = useState<"idle" | "checking" | "ok" | "fail">("idle");
  const [distance, setDistance] = useState<number | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Rotating QR token
  useEffect(() => {
    setToken(randomToken());
    const id = setInterval(() => {
      setTtl((prev) => {
        if (prev <= 1) {
          setToken(randomToken());
          return QR_ROTATE_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Elapsed check-in timer
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed((e) => e + 0.1), 100);
    return () => clearInterval(id);
  }, [running]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const startScan = () => {
    setRunning(true);
    setElapsed(0);
    setStep(1);
    setGeoState("checking");
    setTimeout(() => {
      const d = 6 + Math.round(Math.random() * 8);
      setDistance(d);
      setGeoState("ok");
      setStep(2);
    }, 1200);
  };

  const openCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCameraError("Camera access blocked. Allow camera permission to complete face verification.");
    }
  };

  const captureSelfie = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setCameraError("Camera not ready yet — start the camera first.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = (video.videoHeight / video.videoWidth) * 320;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setSelfie(canvas.toDataURL("image/jpeg", 0.8));
    stopCamera();
    setRunning(false);
    setStep(3);
    toast.success("Attendance marked", {
      description: `${live.title} · verified in ${elapsed.toFixed(1)}s`,
    });
  };

  const reset = () => {
    stopCamera();
    setStep(0);
    setElapsed(0);
    setRunning(false);
    setGeoState("idle");
    setDistance(null);
    setSelfie(null);
    setCameraError(null);
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Three-factor check-in"
        title="Secure attendance"
        description="Dynamic QR rotates every 8 seconds, geofence confirms you are inside the room, and a liveness selfie is stored for faculty audit."
        action={
          <Button variant="ghost" size="sm" onClick={reset}>
            <RefreshCw className="h-4 w-4" /> Reset demo
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="surface-card rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Live session</p>
              <h3 className="mt-1 font-display text-xl font-semibold">{live.title}</h3>
              <p className="text-sm text-muted-foreground">
                {live.code} · {live.room} · {live.faculty}
              </p>
            </div>
            <Badge className="bg-primary text-primary-foreground">Open</Badge>
          </div>

          <div className="relative mt-6 overflow-hidden rounded-2xl border border-border bg-secondary/40 p-6">
            <div className="mx-auto grid aspect-square w-full max-w-64 grid-cols-8 gap-1 rounded-xl bg-foreground/95 p-3">
              {Array.from({ length: 64 }).map((_, i) => {
                const on = (token.charCodeAt(i % token.length) + i * 7) % 3 !== 0;
                return (
                  <span
                    key={i}
                    className={`aspect-square rounded-[2px] ${on ? "bg-background" : "bg-transparent"}`}
                  />
                );
              })}
            </div>
            <div className="pointer-events-none absolute inset-x-10 h-0.5 bg-primary/80 animate-scanline" />
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="font-mono text-primary">{token}</span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Timer className="h-3.5 w-3.5" /> rotates in {ttl}s
            </span>
          </div>
          <Progress value={(ttl / QR_ROTATE_SECONDS) * 100} className="mt-2 h-1.5" />
        </div>

        <div className="space-y-4">
          <div className="surface-card rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Check-in timer</p>
              <span
                className={`font-display text-3xl font-semibold ${elapsed > 30 ? "text-destructive" : "text-primary"}`}
              >
                {elapsed.toFixed(1)}s
              </span>
            </div>
            <Progress value={Math.min((elapsed / 30) * 100, 100)} className="mt-3 h-2" />
            <p className="mt-2 text-xs text-muted-foreground">Target: complete all three factors in 30 seconds.</p>
          </div>

          <VerificationStep
            index={1}
            active={step === 0}
            done={step > 0}
            icon={QrCode}
            title="Scan the dynamic QR"
            body="The projected code changes every 8 seconds, so a screenshot shared with a friend expires instantly."
          >
            <Button onClick={startScan} disabled={step > 0}>
              <QrCode className="h-4 w-4" /> Scan code
            </Button>
          </VerificationStep>

          <VerificationStep
            index={2}
            active={step === 1 || step === 2}
            done={step > 1}
            icon={MapPin}
            title="Geofence verification"
            body="Your device location is matched against the classroom polygon with a 25 m radius."
          >
            {geoState === "checking" ? (
              <p className="text-sm text-muted-foreground">Locating device…</p>
            ) : geoState === "ok" ? (
              <p className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" /> Inside {live.room} · {distance} m from beacon
              </p>
            ) : geoState === "fail" ? (
              <p className="flex items-center gap-2 text-sm text-destructive">
                <XCircle className="h-4 w-4" /> Outside the classroom geofence
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Waiting for QR scan.</p>
            )}
          </VerificationStep>

          <VerificationStep
            index={3}
            active={step === 2}
            done={step === 3}
            icon={Camera}
            title="Liveness selfie"
            body="A quick front-camera capture is attached to the record so faculty can audit any flagged entry."
          >
            {step === 3 && selfie ? (
              <div className="flex items-center gap-3">
                <img src={selfie} alt="Captured verification selfie" className="h-16 w-16 rounded-xl object-cover" />
                <p className="flex items-center gap-2 text-sm text-success">
                  <ShieldCheck className="h-4 w-4" /> Face captured & matched
                </p>
              </div>
            ) : step === 2 ? (
              <div className="space-y-3">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="h-40 w-full rounded-xl bg-secondary object-cover"
                />
                {cameraError ? <p className="text-sm text-destructive">{cameraError}</p> : null}
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={openCamera}>
                    <Camera className="h-4 w-4" /> Start camera
                  </Button>
                  <Button onClick={captureSelfie}>Capture & submit</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Unlocks after geofence passes.</p>
            )}
          </VerificationStep>

          {step === 3 ? (
            <div className="rounded-2xl border border-primary/50 bg-primary/10 p-5 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
              <h3 className="mt-2 font-display text-xl font-semibold">Attendance recorded</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {live.title} · verified in {elapsed.toFixed(1)} seconds · +40 XP
              </p>
              <Button asChild variant="secondary" className="mt-4">
                <Link to="/rewards">See XP update</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function VerificationStep({
  index,
  active,
  done,
  icon: Icon,
  title,
  body,
  children,
}: {
  index: number;
  active: boolean;
  done: boolean;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`surface-card rounded-2xl p-5 transition-colors ${
        active ? "border-primary/60" : done ? "border-success/40" : "opacity-80"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
            done ? "bg-success text-success-foreground" : active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
          }`}
        >
          {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        </span>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Step {index}</p>
          <h4 className="font-display text-lg font-semibold">{title}</h4>
          <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
