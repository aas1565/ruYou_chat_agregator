"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

export function ReplyComposer({
  disabled,
  sending,
  mode = "admin",
  onSend,
}: {
  disabled?: boolean;
  sending?: boolean;
  mode?: "admin" | "client";
  onSend: (text: string) => Promise<void> | void;
}) {
  const [text, setText] = useState("");
  const empty = text.trim().length === 0;

  async function submit() {
    if (empty || sending) return;
    const value = text.trim();
    setText("");
    await onSend(value);
  }

  return (
    <div className="border-t border-border bg-surface p-4 md:px-8">
      <Textarea
        value={text}
        disabled={disabled}
        placeholder={mode === "client" ? "Напишите сообщение от клиента для проверки AI…" : "Напишите ответ клиенту…"}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            void submit();
          }
        }}
      />
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-muted">
          {mode === "client" ? "Сообщение уйдёт в чат как клиент" : "Ctrl/Cmd + Enter — отправить"}
        </p>
        <Button disabled={empty || sending || disabled} onClick={() => void submit()}>
          {sending ? "Отправка…" : mode === "client" ? "Отправить клиентом" : "Отправить"}
        </Button>
      </div>
    </div>
  );
}
