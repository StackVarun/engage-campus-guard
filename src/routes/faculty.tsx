import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, ShieldAlert, Timer, Users } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SectionHeader } from "@/components/SectionHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  attendanceTrend,
  facultySessionRoster,
  subjectAttendance,
  toolUsage,
} from "@/lib/mock-data";

export const Route = createFileRoute("/faculty")({
  head: () => ({
    meta: [
      { title: "Faculty Analytics — PresenceOS" },
      {
        name: "description",
        content:
          "Real-time session rosters, proxy-attempt flags, attendance trends and learning-tool usage for faculty and administration.",
      },
      { property: "og:title", content: "Faculty Analytics — PresenceOS" },
      {
        property: "og:description",
        content: "Institutional intelligence on attendance trends, learning habits and tool usage.",
      },
    ],
  }),
  component: FacultyPage,
});

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: "0.75rem",
  color: "var(--color-popover-foreground)",
};

function FacultyPage() {
  const flagged = facultySessionRoster.filter((r) => r.geo === "fail" || r.face === "review");

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Institutional intelligence"
        title="Faculty console"
        description="Cloud Computing · CS605 · LH-301 · live session started 11:30"
        action={
          <Button variant="secondary" size="sm">
            Close attendance window
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Marked present" value="52/58" sub="89.6% of roster" tone="primary" />
        <StatCard icon={Timer} label="Median check-in" value="14.8s" sub="Target under 30s" tone="accent" />
        <StatCard icon={ShieldAlert} label="Proxy blocked" value="4" sub="This week across sections" />
        <StatCard icon={AlertTriangle} label="Flagged now" value={String(flagged.length)} sub="Needs faculty review" tone="xp" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-card rounded-2xl p-6">
          <h3 className="font-display text-lg font-semibold">Attendance & proxy attempts</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceTrend}>
                <defs>
                  <linearGradient id="present" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="week" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="present" stroke="var(--color-chart-1)" fill="url(#present)" strokeWidth={2} />
                <Line type="monotone" dataKey="proxyBlocked" stroke="var(--color-chart-5)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card rounded-2xl p-6">
          <h3 className="font-display text-lg font-semibold">Attendance by subject</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectAttendance}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="subject" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis domain={[70, 100]} stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-secondary)" }} />
                <Bar dataKey="pct" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="surface-card rounded-2xl p-6">
        <h3 className="font-display text-lg font-semibold">Live session roster</h3>
        <p className="text-sm text-muted-foreground">Each entry carries QR token, geofence result and liveness selfie.</p>
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Roll no.</TableHead>
                <TableHead>Marked at</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Geofence</TableHead>
                <TableHead>Face</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facultySessionRoster.map((row) => (
                <TableRow key={row.roll}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{row.roll}</TableCell>
                  <TableCell className="font-mono text-xs">{row.time}</TableCell>
                  <TableCell className={row.seconds > 30 ? "text-destructive" : "text-primary"}>
                    {row.seconds}s
                  </TableCell>
                  <TableCell>
                    {row.geo === "ok" ? (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Inside
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <ShieldAlert className="h-3 w-3" /> Outside
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.face === "ok" ? (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Matched
                      </Badge>
                    ) : (
                      <Badge className="gap-1 bg-warning text-warning-foreground">
                        <AlertTriangle className="h-3 w-3" /> Review
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="surface-card rounded-2xl p-6">
        <h3 className="font-display text-lg font-semibold">Learning tool usage</h3>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={toolUsage} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis dataKey="tool" type="category" width={120} stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-secondary)" }} />
              <Bar dataKey="sessions" fill="var(--color-chart-3)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
