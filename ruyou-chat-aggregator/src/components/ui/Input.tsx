import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm text-ink placeholder:text-muted/70 transition hover:border-muted/40 focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent/20",
        className,
      )}
      {...props}
    />
  );
}
