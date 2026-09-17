import { cn } from "@/lib/utils";
import type { SelectHTMLAttributes } from "react";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-ink hover:border-slate-300",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
