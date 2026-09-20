import { describe, expect, it } from "vitest";

import { createAcademicSuggestions, detectFreePeriods } from "@/lib/academic-intelligence";

describe("academic intelligence", () => {
  it("detects gaps before, between, and after classes", () => {
    const freePeriods = detectFreePeriods([
      { id: "one", start: "09:00", end: "10:00" },
      { id: "two", start: "10:00", end: "11:00" },
      { id: "three", start: "12:00", end: "13:00" },
    ]);

    expect(freePeriods).toEqual([
      { id: "free-08:00-09:00", start: "08:00", end: "09:00", minutes: 60 },
      { id: "free-11:00-12:00", start: "11:00", end: "12:00", minutes: 60 },
      { id: "free-13:00-19:00", start: "13:00", end: "19:00", minutes: 360 },
    ]);
  });

  it("assigns deterministic study modes by gap length and subject", () => {
    const freePeriods = [
      { id: "short", start: "08:00", end: "08:20", minutes: 20 },
      { id: "medium", start: "11:00", end: "11:45", minutes: 45 },
      { id: "long", start: "13:00", end: "15:00", minutes: 120 },
    ];

    const planned = createAcademicSuggestions(freePeriods, [
      { code: "CS601", name: "Machine Learning" },
      { code: "CS603", name: "Computer Networks" },
    ]);

    expect(planned.map(({ suggestion }) => suggestion)).toEqual([
      {
        title: "Review CS601 · Machine Learning",
        kind: "Quick review",
        minutes: 20,
        reason: "Use this short gap to revisit key terms, formulas, or lecture notes.",
      },
      {
        title: "Practice CS603 · Computer Networks",
        kind: "Practice",
        minutes: 45,
        reason: "A medium-length gap is a good fit for worked examples or problem-solving.",
      },
      {
        title: "Study CS601 · Machine Learning",
        kind: "Deep study",
        minutes: 60,
        reason: "Use this longer window for focused reading, notes, and a deeper study session.",
      },
    ]);
  });
});
