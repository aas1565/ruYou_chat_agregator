import { useEffect, useRef } from "react";
import { MessageBubble } from "@/components/inbox/MessageBubble";
import { EmptyState } from "@/components/ui/EmptyState";
import type { MessageDto } from "@/lib/types";

export function MessageThread({ messages }: { messages: MessageDto[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  if (messages.length === 0) {
    return <EmptyState title="Сообщений пока нет" />;
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto bg-bg px-4 py-5 scrollbar-thin md:px-8">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={endRef} />
    </div>
  );
}
