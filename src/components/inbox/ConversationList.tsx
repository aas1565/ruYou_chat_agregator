import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CHANNEL_LABELS, CHANNELS, CONVERSATION_STATUS_LABELS, CONVERSATION_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ConversationItem } from "@/components/inbox/ConversationItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/LoadingState";
import type { ConversationListItem } from "@/lib/types";

const FILTERS = [
  { id: "all", label: "Все" },
  { id: "unread", label: "Непрочитанные" },
  { id: "operator", label: "Требуется оператор" },
] as const;

export function ConversationList({
  items,
  loading,
  selectedId,
  q,
  channel,
  status,
  filter,
  onSelect,
  onQueryChange,
  onChannelChange,
  onStatusChange,
  onFilterChange,
}: {
  items: ConversationListItem[];
  loading: boolean;
  selectedId?: string;
  q: string;
  channel: string;
  status: string;
  filter: string;
  onSelect: (id: string) => void;
  onQueryChange: (value: string) => void;
  onChannelChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onFilterChange: (value: string) => void;
}) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col border-r border-border bg-white">
      <div className="space-y-3 border-b border-border p-4">
        <div>
          <h1 className="text-base font-semibold">Входящие</h1>
          <p className="text-xs text-muted">Все каналы в одном списке</p>
        </div>
        <Input
          value={q}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Поиск по имени или тексту"
        />
        <div className="grid grid-cols-2 gap-2">
          <Select value={channel} onChange={(event) => onChannelChange(event.target.value)}>
            <option value="">Все каналы</option>
            {CHANNELS.map((item) => (
              <option key={item} value={item}>
                {CHANNEL_LABELS[item]}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(event) => onStatusChange(event.target.value)}>
            <option value="">Все статусы</option>
            {CONVERSATION_STATUSES.map((item) => (
              <option key={item} value={item}>
                {CONVERSATION_STATUS_LABELS[item]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              onClick={() => onFilterChange(item.id)}
              className={cn(
                "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition",
                filter === item.id ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        {loading ? (
          <ListSkeleton />
        ) : items.length === 0 ? (
          <EmptyState title="Диалогов нет" description="Измените фильтры или дождитесь новых обращений." />
        ) : (
          items.map((item) => (
            <ConversationItem
              key={item.id}
              item={item}
              active={item.id === selectedId}
              onSelect={() => onSelect(item.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
