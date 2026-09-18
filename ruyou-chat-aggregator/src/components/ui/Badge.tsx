import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "warning" | "danger" | "success";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-tight",
        tone === "neutral" && "bg-surface-3 text-muted",
        tone === "accent" && "bg-accent-soft text-accent",
        tone === "warning" && "bg-amber-500/15 text-amber-300",
        tone === "danger" && "bg-red-500/15 text-red-300",
        tone === "success" && "bg-emerald-500/15 text-emerald-300",
        className,
      )}
    >
      {children}
    </span>
  );
}
