// Prototype data. Replace with Lovable Cloud tables when the backend is added.

export const student = {
  name: "Varun T G",
  roll: "1MS22CS118",
  branch: "CSE · Semester 6",
  section: "B",
  xp: 4820,
  level: 12,
  xpToNextLevel: 680,
  streak: 17,
  attendancePct: 91,
  rank: 4,
  cohortSize: 68,
};

export type ClassSlot = {
  id: string;
  code: string;
  title: string;
  faculty: string;
  room: string;
  start: string;
  end: string;
  status: "done" | "live" | "upcoming";
};

export const todaySchedule: ClassSlot[] = [
  { id: "s1", code: "CS601", title: "Machine Learning", faculty: "Dr. Anitha R", room: "LH-204", start: "09:00", end: "10:00", status: "done" },
  { id: "s2", code: "CS603", title: "Computer Networks", faculty: "Prof. Kiran S", room: "LH-208", start: "10:00", end: "11:00", status: "done" },
  { id: "s3", code: "CS605", title: "Cloud Computing", faculty: "Dr. Meera N", room: "LH-301", start: "11:30", end: "12:30", status: "live" },
  { id: "s4", code: "CS607", title: "Compiler Design", faculty: "Prof. Rahul V", room: "LH-112", start: "14:30", end: "15:30", status: "upcoming" },
  { id: "s5", code: "CSL61", title: "ML Lab", faculty: "Dr. Anitha R", room: "Lab-3", start: "15:30", end: "17:30", status: "upcoming" },
];

export type FreeSlot = {
  id: string;
  start: string;
  end: string;
  minutes: number;
  suggestions: { title: string; kind: string; minutes: number; xp: number; reason: string }[];
};

export const freeSlots: FreeSlot[] = [
  {
    id: "f1",
    start: "12:30",
    end: "14:30",
    minutes: 120,
    suggestions: [
      { title: "Compiler Design: LR parsing drill", kind: "Practice set", minutes: 40, xp: 120, reason: "Next class in 2h — pre-read boosts recall" },
      { title: "DBMS backlog: normalization module", kind: "Video + quiz", minutes: 35, xp: 90, reason: "Lowest scoring unit in IA-2" },
      { title: "Aptitude sprint — time & work", kind: "Placement prep", minutes: 25, xp: 60, reason: "Campus drive in 3 weeks" },
    ],
  },
  {
    id: "f2",
    start: "17:30",
    end: "19:00",
    minutes: 90,
    suggestions: [
      { title: "ML Lab record + inference notes", kind: "Assignment", minutes: 45, xp: 110, reason: "Submission due tomorrow" },
      { title: "Networks: subnetting practice", kind: "Practice set", minutes: 30, xp: 80, reason: "Weak area flagged by faculty" },
    ],
  },
];

export const badges = [
  { id: "b1", name: "Iron Streak", desc: "15-day attendance streak", earned: true, icon: "flame" },
  { id: "b2", name: "First In", desc: "Marked present within 10s, 20 times", earned: true, icon: "zap" },
  { id: "b3", name: "Gap Filler", desc: "Completed 25 free-slot tasks", earned: true, icon: "puzzle" },
  { id: "b4", name: "Lab Ace", desc: "All lab records on time this sem", earned: true, icon: "beaker" },
  { id: "b5", name: "Perfect Month", desc: "100% attendance for 30 days", earned: false, icon: "calendar" },
  { id: "b6", name: "Mentor", desc: "Answer 50 peer doubts", earned: false, icon: "users" },
];

export const leaderboard = [
  { rank: 1, name: "Aisha Khan", xp: 5940, streak: 26 },
  { rank: 2, name: "Rohit Menon", xp: 5610, streak: 22 },
  { rank: 3, name: "Sneha Iyer", xp: 5120, streak: 19 },
  { rank: 4, name: "Varun T G", xp: 4820, streak: 17 },
  { rank: 5, name: "Dev Patel", xp: 4610, streak: 14 },
];

export const xpTimeline = [
  { day: "Mon", xp: 210 }, { day: "Tue", xp: 340 }, { day: "Wed", xp: 180 },
  { day: "Thu", xp: 420 }, { day: "Fri", xp: 380 }, { day: "Sat", xp: 150 }, { day: "Sun", xp: 90 },
];

export const attendanceTrend = [
  { week: "W1", present: 94, proxyBlocked: 3 },
  { week: "W2", present: 91, proxyBlocked: 5 },
  { week: "W3", present: 88, proxyBlocked: 2 },
  { week: "W4", present: 93, proxyBlocked: 6 },
  { week: "W5", present: 95, proxyBlocked: 1 },
  { week: "W6", present: 92, proxyBlocked: 4 },
];

export const subjectAttendance = [
  { subject: "ML", pct: 96 },
  { subject: "Networks", pct: 89 },
  { subject: "Cloud", pct: 93 },
  { subject: "Compilers", pct: 84 },
  { subject: "ML Lab", pct: 98 },
];

export const facultySessionRoster = [
  { name: "Aisha Khan", roll: "1MS22CS004", time: "11:31:04", seconds: 9, geo: "ok", face: "ok" },
  { name: "Rohit Menon", roll: "1MS22CS061", time: "11:31:11", seconds: 14, geo: "ok", face: "ok" },
  { name: "Varun T G", roll: "1MS22CS118", time: "11:31:19", seconds: 21, geo: "ok", face: "ok" },
  { name: "Sneha Iyer", roll: "1MS22CS091", time: "11:31:26", seconds: 12, geo: "ok", face: "review" },
  { name: "Dev Patel", roll: "1MS22CS030", time: "11:31:33", seconds: 18, geo: "fail", face: "ok" },
];

export const toolUsage = [
  { tool: "AI Tutor", sessions: 1284 },
  { tool: "Free-slot tasks", sessions: 962 },
  { tool: "Practice sets", sessions: 741 },
  { tool: "Lab prep", sessions: 508 },
];

export const aiSuggestedPrompts = [
  "Explain LR(1) parsing with a worked example",
  "Summarise today's Cloud Computing lecture",
  "Quiz me on TCP congestion control",
  "Why is my Compilers attendance below 85%?",
];
