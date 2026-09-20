import { createFileRoute } from "@tanstack/react-router";
import { Beaker, CalendarCheck, Flame, Lock, Puzzle, Trophy, Users, Zap } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { SectionHeader } from "@/components/SectionHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { badges, leaderboard, xpTimeline } from "@/lib/mock-data";
import { requireRouteRole } from "@/lib/auth/route-guards";

export const Route = createFileRoute("/rewards")({
  beforeLoad: () => requireRouteRole("STUDENT"),
  loader: async () => ({ user: await requireRouteRole("STUDENT") }),
  head: () => ({
    meta: [
      { title: "XP & Badges — PresenceOS" },
      {
        name: "description",
        content:
          "Track XP earned from attendance and study blocks, unlock milestone badges and climb the cohort leaderboard.",
      },
      { property: "og:title", content: "XP & Badges — PresenceOS" },
      {
        property: "og:description",
        content: "Gamified consistency: XP points, milestone badges and cohort leaderboards.",
      },
    ],
  }),
  component: RewardsPage,
});

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  flame: Flame,
  zap: Zap,
  puzzle: Puzzle,
  beaker: Beaker,
  calendar: CalendarCheck,
  users: Users,
};

function RewardsPage() {
  const { user } = Route.useLoaderData();
  const displayName = user.profile?.fullName ?? user.email;
  const weeklyXp = xpTimeline.reduce((s, d) => s + d.xp, 0);

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Gamified learning"
        title="Rewards & progress"
        description="XP is earned for fast check-ins, completed free-slot tasks and on-time submissions. Badges unlock at consistency milestones."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Zap}
          label="Total XP"
          value="0"
          sub="Available in a later phase"
          tone="xp"
        />
        <StatCard
          icon={Trophy}
          label="This week"
          value={`${weeklyXp} XP`}
          sub="+18% vs last week"
          tone="primary"
        />
        <StatCard
          icon={Flame}
          label="Streak"
          value="—"
          sub="Available in a later phase"
          tone="accent"
        />
        <StatCard
          icon={CalendarCheck}
          label="Badges"
          value={`${badges.filter((b) => b.earned).length}/${badges.length}`}
          sub="2 within reach"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="surface-card rounded-2xl p-6">
          <h3 className="font-display text-lg font-semibold">XP earned this week</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={xpTimeline}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "0.75rem",
                    color: "var(--color-popover-foreground)",
                  }}
                  cursor={{ fill: "var(--color-secondary)" }}
                />
                <Bar dataKey="xp" fill="var(--color-chart-3)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card rounded-2xl p-6">
          <h3 className="font-display text-lg font-semibold">Cohort leaderboard</h3>
          <ul className="mt-4 space-y-2">
            {leaderboard.map((row) => {
              const isMe = row.name === displayName;
              return (
                <li
                  key={row.rank}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                    isMe ? "border border-primary/50 bg-primary/10" : "bg-secondary/40"
                  }`}
                >
                  <span className="w-6 font-display text-sm font-semibold text-muted-foreground">
                    #{row.rank}
                  </span>
                  <span className="flex-1 text-sm font-medium">{row.name}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Flame className="h-3 w-3 text-accent" /> {row.streak}
                  </span>
                  <span className="font-mono text-sm text-xp">{row.xp.toLocaleString()}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="surface-card rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold">Milestone badges</h3>
          <span className="text-sm text-muted-foreground">
            Gamification data will be connected in a later phase.
          </span>
        </div>
        <Progress value={0} className="mt-3 h-2" />

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {badges.map((badge) => {
            const Icon = iconMap[badge.icon] ?? Trophy;
            return (
              <li
                key={badge.id}
                className={`flex items-start gap-3 rounded-xl border p-4 ${
                  badge.earned
                    ? "border-xp/50 bg-xp/10"
                    : "border-border bg-secondary/30 opacity-70"
                }`}
              >
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                    badge.earned ? "bg-xp text-xp-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {badge.earned ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                </span>
                <div>
                  <p className="font-medium">{badge.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{badge.desc}</p>
                  <Badge
                    variant={badge.earned ? "default" : "outline"}
                    className="mt-2 text-[10px]"
                  >
                    {badge.earned ? "Earned" : "Locked"}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
