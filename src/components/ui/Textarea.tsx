import { cn } from "@/lib/utils";
import type { TextareaHTMLAttributes } from "react";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[88px] w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink placeholder:text-slate-400 hover:border-slate-300",
        className,
      )}
      {...props}
    />
  );
}
