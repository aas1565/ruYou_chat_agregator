import { Button } from "@/components/ui/Button";

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
      <p className="text-sm text-muted">
        {total === 0 ? "Нет записей" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} из ${total}`}
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Назад
        </Button>
        <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
          Вперёд
        </Button>
      </div>
    </div>
  );
}
