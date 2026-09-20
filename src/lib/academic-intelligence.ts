export type ScheduleEntry = {
  id: string;
  start: string;
  end: string;
};

export type StudySubject = {
  code: string;
  name: string;
};

export type FreePeriod = {
  id: string;
  start: string;
  end: string;
  minutes: number;
};

export type AcademicSuggestion = {
  title: string;
  kind: "Quick review" | "Practice" | "Deep study";
  minutes: number;
  reason: string;
};

export type PlannedFreePeriod = FreePeriod & {
  suggestion: AcademicSuggestion;
};

type FreePeriodOptions = {
  dayStart?: string;
  dayEnd?: string;
  minimumMinutes?: number;
};

const DEFAULT_DAY_START = "08:00";
const DEFAULT_DAY_END = "19:00";
const DEFAULT_MINIMUM_GAP = 15;

function toMinutes(time: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) {
    throw new Error(`Invalid time: ${time}`);
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    throw new Error(`Invalid time: ${time}`);
  }

  return hours * 60 + minutes;
}

function toTime(value: number): string {
  const hours = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (value % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function detectFreePeriods(
  schedule: ScheduleEntry[],
  {
    dayStart = DEFAULT_DAY_START,
    dayEnd = DEFAULT_DAY_END,
    minimumMinutes = DEFAULT_MINIMUM_GAP,
  }: FreePeriodOptions = {},
): FreePeriod[] {
  const startOfDay = toMinutes(dayStart);
  const endOfDay = toMinutes(dayEnd);
  if (endOfDay <= startOfDay) {
    throw new Error("The timetable day must end after it starts");
  }

  const orderedSchedule = schedule
    .map((entry) => ({ start: toMinutes(entry.start), end: toMinutes(entry.end) }))
    .filter((entry) => entry.end > startOfDay && entry.start < endOfDay)
    .sort((a, b) => a.start - b.start);

  const freePeriods: FreePeriod[] = [];
  let cursor = startOfDay;

  const addPeriod = (start: number, end: number) => {
    const minutes = end - start;
    if (minutes < minimumMinutes) return;

    freePeriods.push({
      id: `free-${toTime(start)}-${toTime(end)}`,
      start: toTime(start),
      end: toTime(end),
      minutes,
    });
  };

  for (const entry of orderedSchedule) {
    const entryStart = Math.max(entry.start, startOfDay);
    const entryEnd = Math.min(entry.end, endOfDay);
    if (entryStart > cursor) addPeriod(cursor, entryStart);
    cursor = Math.max(cursor, entryEnd);
  }

  if (cursor < endOfDay) addPeriod(cursor, endOfDay);
  return freePeriods;
}

export function createAcademicSuggestions(
  freePeriods: FreePeriod[],
  subjects: StudySubject[],
): PlannedFreePeriod[] {
  return freePeriods.map((period, index) => {
    const subject = subjects[index % subjects.length] ?? {
      code: "STUDY",
      name: "your course notes",
    };

    if (period.minutes < 30) {
      return {
        ...period,
        suggestion: {
          title: `Review ${subject.code} · ${subject.name}`,
          kind: "Quick review",
          minutes: period.minutes,
          reason: "Use this short gap to revisit key terms, formulas, or lecture notes.",
        },
      };
    }

    if (period.minutes < 60) {
      return {
        ...period,
        suggestion: {
          title: `Practice ${subject.code} · ${subject.name}`,
          kind: "Practice",
          minutes: Math.min(period.minutes, 45),
          reason: "A medium-length gap is a good fit for worked examples or problem-solving.",
        },
      };
    }

    return {
      ...period,
      suggestion: {
        title: `Study ${subject.code} · ${subject.name}`,
        kind: "Deep study",
        minutes: Math.min(period.minutes, 60),
        reason: "Use this longer window for focused reading, notes, and a deeper study session.",
      },
    };
  });
}
