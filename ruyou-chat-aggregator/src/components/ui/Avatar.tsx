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
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold text-muted",
        className,
      )}
    >
      {initials(firstName, lastName)}
    </div>
  );
}
