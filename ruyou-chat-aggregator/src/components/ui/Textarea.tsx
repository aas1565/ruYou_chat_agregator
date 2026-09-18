import { cn } from "@/lib/utils";
import type { TextareaHTMLAttributes } from "react";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[88px] w-full resize-none rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-muted/70 transition hover:border-muted/40 focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent/20",
        className,
      )}
      {...props}
    />
  );
}
