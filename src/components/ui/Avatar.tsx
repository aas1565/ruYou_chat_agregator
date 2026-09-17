import { initials } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function Avatar({
  firstName,
  lastName,
  className,
}: {
  firstName: string;
  lastName?: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700",
        className,
      )}
    >
      {initials(firstName, lastName)}
    </div>
  );
}
