import { cn } from "@/lib/utils";
import type { SelectHTMLAttributes } from "react";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm text-ink transition hover:border-muted/40 focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent/20",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
