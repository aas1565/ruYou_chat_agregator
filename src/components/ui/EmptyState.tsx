import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      <p className="text-sm font-medium text-ink">{title}</p>
      {description ? <p className="mt-1 w-full max-w-full text-sm leading-5 text-muted">{description}</p> : null}
    </div>
  );
}
