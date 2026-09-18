import { Button } from "@/components/ui/Button";

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-medium text-ink">Не удалось загрузить данные</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>
      {onRetry ? (
        <Button className="mt-4" size="sm" variant="secondary" onClick={onRetry}>
          Повторить
        </Button>
      ) : null}
    </div>
  );
}
