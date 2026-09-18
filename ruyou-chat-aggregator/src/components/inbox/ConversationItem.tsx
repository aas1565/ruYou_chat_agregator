import { ChannelIcon } from "@/components/ChannelIcon";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import type { ConversationListItem } from "@/lib/types";
import { CONVERSATION_STATUS_LABELS } from "@/lib/constants";
import { cn, formatRelativeTime, fullName, truncate } from "@/lib/utils";

export function ConversationItem({
  item,
  active,
  onSelect,
}: {
  item: ConversationListItem;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition hover:border-border hover:bg-surface-2 hover:shadow-none",
        active && "border-accent/30 bg-accent-soft shadow-none hover:border-accent/30 hover:bg-accent-soft",
      )}
    >
      <Avatar firstName={item.client.firstName} lastName={item.client.lastName} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{fullName(item.client.firstName, item.client.lastName)}</p>
          <span className="ml-auto shrink-0 text-[11px] text-muted">{formatRelativeTime(item.lastMessageAt)}</span>
        </div>
        <p className="mt-0.5 truncate text-sm text-muted">{truncate(item.lastMessageText, 64)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <ChannelIcon channel={item.channel} withLabel />
          <Badge tone={item.status === "OPEN" ? "accent" : item.status === "PENDING" ? "warning" : "neutral"}>
            {CONVERSATION_STATUS_LABELS[item.status]}
          </Badge>
          <Badge tone={item.handlerType === "OPERATOR" ? "warning" : "neutral"}>
            {item.handlerType === "OPERATOR" ? "Оператор" : "AI"}
          </Badge>
          {item.unreadCount > 0 ? (
            <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-[var(--primary-foreground)]">
              {item.unreadCount}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
