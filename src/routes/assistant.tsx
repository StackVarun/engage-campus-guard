import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, Loader2, Send, Sparkles } from "lucide-react";

import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { aiSuggestedPrompts, todaySchedule } from "@/lib/mock-data";
import { requireRouteRole } from "@/lib/auth/route-guards";

export const Route = createFileRoute("/assistant")({
  beforeLoad: () => requireRouteRole("STUDENT"),
  head: () => ({
    meta: [
      { title: "AI Tutor — PresenceOS" },
      {
        name: "description",
        content:
          "Context-aware academic help that already knows your timetable, syllabus and weak topics — answers without leaving the dashboard.",
      },
      { property: "og:title", content: "AI Tutor — PresenceOS" },
      {
        property: "og:description",
        content: "Instant, context-sensitive academic assistance inside your student dashboard.",
      },
    ],
  }),
  component: AssistantPage,
});

type Message = { role: "user" | "assistant"; text: string };

const seeded: Message[] = [
  {
    role: "assistant",
    text: "Hi — I can see your timetable and subject performance. Ask me about a lecture, a weak topic, or what to study in your next free block.",
  },
];

function mockAnswer(q: string) {
  return `Here's a study-ready breakdown of "${q.trim()}":\n\n1. Core idea — the concept in one sentence, tied to your CS605 syllabus.\n2. Worked example — a step-by-step solution similar to last year's IA question.\n3. Common mistake — where most of your cohort loses marks.\n\nWant me to turn this into a 15-minute practice set for your next free slot?`;
}

function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>(seeded);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const send = (text: string) => {
    const q = text.trim();
    if (!q || thinking) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setMessages((m) => [...m, { role: "assistant", text: mockAnswer(q) }]);
      setThinking(false);
    }, 900);
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Instant academic help"
        title="AI tutor"
        description="Answers are grounded in your live context: today's classes, your attendance gaps and the topics you scored lowest on."
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="surface-card flex min-h-[32rem] flex-col rounded-2xl p-6">
          <div className="flex-1 space-y-4 overflow-y-auto">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm ${
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-secondary/60 text-foreground"
                }`}
              >
                {m.text}
              </div>
            ))}
            {thinking ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {aiSuggestedPrompts.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                className="rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                {p}
              </button>
            ))}
          </div>

          <form
            className="mt-4 flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a topic, lecture or assignment…"
              className="min-h-12 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
            />
            <Button type="submit" size="icon" disabled={thinking}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            Prototype responses. Connect Lovable Cloud to power this with live AI.
          </p>
        </div>

        <div className="space-y-4">
          <div className="surface-card rounded-2xl p-5">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />
              <h3 className="font-display text-base font-semibold">Context in use</h3>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>· Semester 6 CSE syllabus</li>
              <li>· Today's {todaySchedule.length} scheduled classes</li>
              <li>· IA-2 scores and weak units</li>
              <li>· Attendance record per subject</li>
            </ul>
          </div>

          <div className="surface-card rounded-2xl p-5">
            <div className="flex items-center gap-2 text-accent">
              <BookOpen className="h-4 w-4" />
              <h3 className="font-display text-base font-semibold">Recently discussed</h3>
            </div>
            <ul className="mt-3 space-y-2">
              {["TCP congestion control", "Kubernetes autoscaling", "SLR vs LALR tables"].map(
                (t) => (
                  <li key={t} className="rounded-lg bg-secondary/40 px-3 py-2 text-sm">
                    {t}
                  </li>
                ),
              )}
            </ul>
            <Badge variant="outline" className="mt-3">
              12 sessions this week
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
