import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarClock, CheckCircle2, Clock, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";

import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { freeSlots, todaySchedule } from "@/lib/mock-data";

export const Route = createFileRoute("/timetable")({
  head: () => ({
    meta: [
      { title: "Free Time Planner — PresenceOS" },
      {
        name: "description",
        content:
          "Dynamic timetable parsing turns idle gaps between classes into targeted, XP-earning learning blocks.",
      },
      { property: "og:title", content: "Free Time Planner — PresenceOS" },
      {
        property: "og:description",
        content: "Turn idle hours between lectures into targeted micro-learning sessions.",
      },
    ],
  }),
  component: TimetablePage,
});

function TimetablePage() {
  const [claimed, setClaimed] = useState<string[]>([]);
  const totalFree = freeSlots.reduce((sum, s) => sum + s.minutes, 0);
  const plannedMinutes = freeSlots
    .flatMap((s) => s.suggestions)
    .filter((s) => claimed.includes(s.title))
    .reduce((sum, s) => sum + s.minutes, 0);

  const claim = (title: string, xp: number) => {
    setClaimed((c) => (c.includes(title) ? c.filter((t) => t !== title) : [...c, title]));
    if (!claimed.includes(title)) {
      toast.success("Added to your plan", { description: `Completing it earns +${xp} XP` });
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Structured free time"
        title="Turn gaps into progress"
        description="Your timetable is parsed each morning; every gap longer than 25 minutes becomes a planned learning block matched to your weakest topics and upcoming deadlines."
        action={
          <Button variant="secondary" size="sm" onClick={() => toast.info("Timetable re-parsed", { description: "2 free blocks detected for today" })}>
            <Upload className="h-4 w-4" /> Re-parse timetable
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="surface-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Free today</p>
          <p className="mt-2 font-display text-3xl font-semibold text-accent">{totalFree} min</p>
        </div>
        <div className="surface-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Planned</p>
          <p className="mt-2 font-display text-3xl font-semibold text-primary">{plannedMinutes} min</p>
          <Progress value={(plannedMinutes / totalFree) * 100} className="mt-3 h-1.5" />
        </div>
        <div className="surface-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Classes today</p>
          <p className="mt-2 font-display text-3xl font-semibold">{todaySchedule.length}</p>
        </div>
      </div>

      <div className="space-y-6">
        {freeSlots.map((slot) => (
          <div key={slot.id} className="surface-card rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent">
                  <CalendarClock className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-lg font-semibold">
                    {slot.start} – {slot.end}
                  </p>
                  <p className="text-xs text-muted-foreground">{slot.minutes} minutes of open time</p>
                </div>
              </div>
              <Badge variant="outline" className="gap-1">
                <Sparkles className="h-3 w-3" /> {slot.suggestions.length} matched tasks
              </Badge>
            </div>

            <ul className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {slot.suggestions.map((s) => {
                const isClaimed = claimed.includes(s.title);
                return (
                  <li
                    key={s.title}
                    className={`rounded-xl border p-4 transition-colors ${
                      isClaimed ? "border-primary/60 bg-primary/10" : "border-border bg-secondary/40"
                    }`}
                  >
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">{s.kind}</p>
                    <p className="mt-1 font-medium leading-snug">{s.title}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{s.reason}</p>
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" /> {s.minutes}m
                      </Badge>
                      <Badge className="bg-xp text-xp-foreground">+{s.xp} XP</Badge>
                    </div>
                    <Button
                      size="sm"
                      variant={isClaimed ? "secondary" : "default"}
                      className="mt-3 w-full"
                      onClick={() => claim(s.title, s.xp)}
                    >
                      {isClaimed ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" /> In plan
                        </>
                      ) : (
                        "Add to plan"
                      )}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
