import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "primary" | "xp" | "accent";
}) {
  const toneClass =
    tone === "primary"
      ? "text-primary"
      : tone === "xp"
        ? "text-xp"
        : tone === "accent"
          ? "text-accent"
          : "text-foreground";

  return (
    <div className="surface-card rounded-2xl p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className={`h-4 w-4 ${toneClass}`} />
        <span className="text-xs font-medium uppercase tracking-widest">{label}</span>
      </div>
      <p className={`mt-3 font-display text-3xl font-semibold ${toneClass}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}
