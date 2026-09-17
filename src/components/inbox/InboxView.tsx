"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, UserRound } from "lucide-react";
import { ConversationList } from "@/components/inbox/ConversationList";
import { MessageThread } from "@/components/inbox/MessageThread";
import { ReplyComposer } from "@/components/inbox/ReplyComposer";
import { ClientCard } from "@/components/inbox/ClientCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ChannelIcon } from "@/components/ChannelIcon";
import { fetchConversation, fetchConversations, sendMessage } from "@/lib/api/conversations";
import { createNote } from "@/lib/api/clients";
import { createLead } from "@/lib/api/leads";
import { ApiRequestError } from "@/lib/api/client";
import { CHANNEL_LABELS, CONVERSATION_STATUS_LABELS } from "@/lib/constants";
import type { ConversationDetail, ConversationListItem } from "@/lib/types";
import { cn, fullName } from "@/lib/utils";

export function InboxView() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>(searchParams.get("c") ?? undefined);
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState("");
  const [filter, setFilter] = useState("all");
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"list" | "chat" | "client">("list");

  const query = useMemo(
    () => ({
      q: q || undefined,
      channel: channel || undefined,
      status: status || undefined,
      filter: filter === "all" ? undefined : filter,
    }),
    [q, channel, status, filter],
  );

  async function loadList() {
    setListLoading(true);
    setError(null);
    try {
      const result = await fetchConversations(query);
      setItems(result.items);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Не удалось загрузить диалоги");
    } finally {
      setListLoading(false);
    }
  }

  async function loadDetail(id: string) {
    setDetailLoading(true);
    setError(null);
    try {
      const result = await fetchConversation(id);
      setDetail(result);
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, unreadCount: 0 } : item)),
      );
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Не удалось открыть диалог");
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadList();
    }, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    const fromQuery = searchParams.get("c");
    if (!fromQuery) return;
    const timeout = setTimeout(() => {
      setSelectedId(fromQuery);
      setMobilePanel("chat");
      void loadDetail(fromQuery);
    }, 0);
    return () => clearTimeout(timeout);
  }, [searchParams]);

  async function handleSelect(id: string) {
    setSelectedId(id);
    setMobilePanel("chat");
    await loadDetail(id);
  }

  async function handleSend(text: string) {
    if (!selectedId) return;
    setSending(true);
    try {
      const result = await sendMessage(selectedId, text);
      setDetail(result);
      setItems((current) => {
        const next = current.map((item) =>
          item.id === selectedId
            ? {
                ...item,
                lastMessageText: text,
                lastMessageAt: new Date().toISOString(),
                handlerType: "OPERATOR" as const,
                unreadCount: 0,
              }
            : item,
        );
        return next.sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt));
      });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Не удалось отправить сообщение");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-56px)] min-h-0 overflow-hidden lg:h-screen">
      <div
        className={cn(
          "h-full min-h-0 shrink-0 flex-col overflow-hidden",
          mobilePanel === "list" ? "flex w-full" : "hidden",
          "md:flex md:w-[340px] lg:w-[360px]",
        )}
      >
        <ConversationList
          items={items}
          loading={listLoading}
          selectedId={selectedId}
          q={q}
          channel={channel}
          status={status}
          filter={filter}
          onSelect={(id) => void handleSelect(id)}
          onQueryChange={setQ}
          onChannelChange={setChannel}
          onStatusChange={setStatus}
          onFilterChange={setFilter}
        />
      </div>

      <div
        className={cn(
          "min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-bg",
          mobilePanel === "chat" ? "flex" : "hidden",
          "md:flex",
        )}
      >
        {!selectedId ? (
          <EmptyState
            className="h-full"
            title="Выберите диалог"
            description="Слева список обращений из всех каналов. Карточка клиента откроется справа."
          />
        ) : detailLoading && !detail ? (
          <LoadingState label="Открываем диалог…" />
        ) : error && !detail ? (
          <ErrorState message={error} onRetry={() => selectedId && void loadDetail(selectedId)} />
        ) : detail ? (
          <>
            <div className="flex items-center gap-3 border-b border-border bg-white px-4 py-3">
              <button
                className="rounded-lg p-2 hover:bg-slate-100 md:hidden"
                onClick={() => setMobilePanel("list")}
                aria-label="К списку"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {fullName(detail.client.firstName, detail.client.lastName)}
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                  <ChannelIcon channel={detail.conversation.channel} withLabel />
                  <span>· {CONVERSATION_STATUS_LABELS[detail.conversation.status]}</span>
                  <span>· {CHANNEL_LABELS[detail.conversation.channel]}</span>
                </div>
              </div>
              <button
                className="rounded-lg p-2 hover:bg-slate-100 xl:hidden"
                onClick={() => setMobilePanel("client")}
                aria-label="Карточка клиента"
              >
                <UserRound className="h-4 w-4" />
              </button>
            </div>
            {error ? <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}
            <MessageThread messages={detail.messages} />
            <ReplyComposer sending={sending} onSend={handleSend} />
          </>
        ) : null}
      </div>

      <div
        className={cn(
          "min-h-0 shrink-0 flex-col overflow-hidden border-l border-border bg-white",
          mobilePanel === "client" ? "flex w-full" : "hidden",
          "xl:flex xl:w-[320px] 2xl:w-[360px]",
        )}
      >
        {detail ? (
          <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-3 py-3 xl:hidden">
              <button className="rounded-lg p-2 hover:bg-slate-100" onClick={() => setMobilePanel("chat")}>
                <ArrowLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-medium">Карточка клиента</p>
            </div>
            <ClientCard
              client={detail.client}
              leads={detail.leads}
              onCreateLead={async (title, funnel) => {
                const lead = await createLead({
                  clientId: detail.client.id,
                  conversationId: detail.conversation.id,
                  title,
                  funnel,
                });
                setDetail({ ...detail, leads: [lead.lead, ...detail.leads] });
              }}
              onSaveNote={async (text) => {
                await createNote({ text, clientId: detail.client.id });
                await loadDetail(detail.conversation.id);
              }}
            />
          </div>
        ) : (
          <div className="flex h-full min-h-0 w-full flex-col p-5">
            <p className="text-sm font-medium">Карточка клиента</p>
            <p className="mt-1 text-sm leading-5 text-muted">
              Выберите диалог, чтобы увидеть контакты и заявки.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
