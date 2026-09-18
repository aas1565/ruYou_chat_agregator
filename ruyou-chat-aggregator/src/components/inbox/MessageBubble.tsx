import { CHANNEL_LABELS, SENDER_LABELS, type MessageSender } from "@/lib/constants";
import type { MessageDto } from "@/lib/types";
import { cn, formatTime } from "@/lib/utils";

const ALIGN: Record<MessageSender, string> = {
  CLIENT: "items-start",
  AI: "items-end",
  OPERATOR: "items-end",
  SYSTEM: "items-center",
};

export function MessageBubble({ message }: { message: MessageDto }) {
  if (message.senderType === "SYSTEM") {
    return (
      <div className="flex justify-center py-1">
        <p className="max-w-[80%] rounded-full bg-surface-3 px-3 py-1 text-center text-xs text-muted">
          {message.text}
        </p>
      </div>
    );
  }

  const outgoing = message.senderType !== "CLIENT";
  return (
    <div className={cn("flex flex-col", ALIGN[message.senderType])}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-5 shadow-none",
          message.senderType === "CLIENT" && "rounded-tl-md border border-border bg-surface-2 text-ink",
          message.senderType === "OPERATOR" &&
            "rounded-tr-md bg-accent text-[var(--primary-foreground)]",
          message.senderType === "AI" && "rounded-tr-md bg-surface-3 text-ink",
        )}
      >
        <p
          className={cn(
            "mb-1 text-[11px] font-medium",
            message.senderType === "OPERATOR"
              ? "text-[var(--primary-foreground)]/75"
              : "text-muted",
          )}
        >          {message.senderName} · {SENDER_LABELS[message.senderType]}
        </p>
        <p className="whitespace-pre-wrap">{message.text}</p>
      </div>
      <p className="mt-1 px-1 text-[11px] text-muted">
        {formatTime(message.createdAt)} · {CHANNEL_LABELS[message.channel]}
        {outgoing ? ` · ${message.deliveryStatus === "READ" ? "прочитано" : "отправлено"}` : ""}
      </p>
    </div>
  );
}
