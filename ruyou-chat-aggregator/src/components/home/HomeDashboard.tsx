"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BellRing,
  CalendarDays,
  ChevronRight,
  Clock3,
  MessageCircle,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { ChannelIcon } from "@/components/ChannelIcon";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ApiRequestError } from "@/lib/api/client";
import { fetchConversations } from "@/lib/api/conversations";
import { fetchLeads } from "@/lib/api/leads";
import { CHANNEL_LABELS, CHANNELS, type Channel } from "@/lib/constants";
import type { ConversationListItem, LeadListItem } from "@/lib/types";
import { cn, formatRelativeTime, fullName, truncate } from "@/lib/utils";

const CHANNEL_ACCENTS: Record<Channel, string> = {
  TELEGRAM: "bg-sky-500/15 text-sky-300",
  WHATSAPP: "bg-emerald-500/15 text-emerald-300",
  WEBSITE_FORM: "bg-violet-500/15 text-violet-300",
  WEBSITE_CHAT: "bg-indigo-500/15 text-indigo-300",
  EMAIL: "bg-amber-500/15 text-amber-300",
  VK: "bg-blue-500/15 text-blue-300",
  AVITO: "bg-orange-500/15 text-orange-300",
  MAX: "bg-fuchsia-500/15 text-fuchsia-300",
  OTHER: "bg-surface-3 text-muted",
};

export function HomeDashboard() {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [leads, setLeads] = useState<LeadListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [conversationResult, leadResult] = await Promise.all([
        fetchConversations({}),
        fetchLeads({}),
      ]);
      setConversations(conversationResult.items);
      setLeads(leadResult.items);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Не удалось загрузить сводку");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, []);

  const stats = useMemo(
    () => ({
      total: conversations.length,
      unread: conversations.reduce((sum, item) => sum + item.unreadCount, 0),
      operator: conversations.filter((item) => item.handlerType === "OPERATOR").length,
      bookings: leads.filter((item) => item.status === "BOOKING_CREATED").length,
    }),
    [conversations, leads],
  );

  const hot = conversations
    .filter((item) => item.unreadCount > 0 || item.handlerType === "OPERATOR")
    .slice(0, 5);

  const activity = useMemo(() => buildActivity(conversations), [conversations]);
  const maxActivity = Math.max(...activity.map((item) => item.value), 1);

  if (loading) return <LoadingState label="Собираем главную…" />;

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <div className="rounded-[22px] border border-red-500/30 bg-red-500/10 p-6">
          <p className="text-sm font-medium text-red-200">Не удалось загрузить dashboard</p>
          <p className="mt-1 text-sm text-red-300/80">{error}</p>
          <Button className="mt-4" size="sm" onClick={() => void load()}>
            Повторить
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="academy-workspace min-h-full">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-6 md:gap-8 md:px-8 md:py-8">
        {/* 1. Header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="academy-eyebrow flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Live workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-ink md:text-4xl">
              Главная
            </h1>
            <p className="mt-2 text-sm text-muted">
              Сводка по обращениям, каналам и задачам оператора.
            </p>
          </div>
          <button
            onClick={() => void load(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm font-medium text-muted transition hover:border-accent/40 hover:text-ink"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Обновить
          </button>
        </header>

        {/* 2. Welcome / hero */}
        <section className="workspace-welcome px-6 py-7 md:px-10 md:py-9">
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 text-sm font-medium text-accent">
              <Sparkles className="h-4 w-4" />
              Единый центр коммуникаций
            </div>
            <h2 className="mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.045em] md:text-5xl">
              Все важное — <span className="text-accent">в одном ритме.</span>
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-muted md:text-base">
              Отслеживайте каналы, замечайте горячие сообщения и возвращайтесь в диалог, которому
              нужен ваш ответ.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/inbox">
                <Button>
                  Открыть обращения
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/appointments">
                <Button variant="secondary">Заявки и записи</Button>
              </Link>
            </div>
          </div>

          <div className="relative z-10 mt-8 w-full max-w-md rounded-[20px] border border-border bg-surface-2/80 p-4 backdrop-blur-sm xl:absolute xl:right-8 xl:top-1/2 xl:mt-0 xl:w-[34%] xl:-translate-y-1/2 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Активность</p>
                <p className="mt-1 text-sm font-medium text-ink">Последние 7 дней</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                <TrendingUp className="h-3.5 w-3.5" />
                Поток живой
              </div>
            </div>
            <div className="mt-6 flex h-32 items-end gap-2">
              {activity.map((item, index) => (
                <div
                  key={item.label}
                  className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                  <div className="relative flex w-full items-end" style={{ height: "86%" }}>
                    <div
                      className={cn(
                        "w-full rounded-t-lg bg-gradient-to-t from-accent/25 to-accent transition-all",
                        index === activity.length - 1 && "opacity-100",
                      )}
                      style={{ height: `${Math.max((item.value / maxActivity) * 100, 8)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted">{item.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-xs text-muted">
              <Clock3 className="h-3.5 w-3.5" />
              Сводка из текущих обращений
            </div>
          </div>
        </section>

        {/* 3. Metrics */}
        <section className="workspace-metrics" aria-label="Ключевые показатели">
          <Metric label="Обращений" value={stats.total} icon={MessageCircle} detail="всего диалогов" />
          <Metric
            label="Непрочитано"
            value={stats.unread}
            icon={BellRing}
            detail="нужны сейчас"
            accent
          />
          <Metric label="Оператор" value={stats.operator} icon={Users} detail="в работе команды" />
          <Metric
            label="Записей создано"
            value={stats.bookings}
            icon={CalendarDays}
            detail="из текущей воронки"
          />
        </section>

        {/* 4. Channels + Hot queue */}
        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-[22px] border border-border bg-surface p-5 shadow-[var(--academy-panel-shadow)] md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="academy-eyebrow">Каналы</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">
                  Состояние потока
                </h2>
              </div>
              <Link
                href="/analytics"
                className="inline-flex items-center text-sm font-medium text-accent hover:text-accent-hover"
              >
                Вся аналитика
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CHANNELS.map((channel) => (
                <ChannelCard
                  key={channel}
                  channel={channel}
                  conversations={conversations}
                />
              ))}
            </div>
          </div>

          <div className="rounded-[22px] border border-border bg-surface p-5 shadow-[var(--academy-panel-shadow)] md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="academy-eyebrow">Сейчас</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">
                  Горячие обращения
                </h2>
              </div>
              <Link
                href="/inbox"
                className="rounded-xl bg-accent-soft p-2 text-accent transition hover:bg-accent/20"
              >
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            {hot.length === 0 ? (
              <EmptyState
                title="Все спокойно"
                description="Новых сообщений, требующих внимания, нет."
                className="px-0 py-12"
              />
            ) : (
              <div className="mt-4 space-y-1">
                {hot.map((item) => (
                  <Link
                    key={item.id}
                    href={`/inbox?c=${item.id}`}
                    className="group block rounded-xl border border-transparent p-3 transition hover:border-border hover:bg-surface-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                        {fullName(item.client.firstName, item.client.lastName)}
                      </div>
                      <span className="text-[11px] text-muted">
                        {formatRelativeTime(item.lastMessageAt)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted">
                      {truncate(item.lastMessageText, 76)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <ChannelIcon channel={item.channel} withLabel />
                      <span
                        className={cn(
                          "text-[11px]",
                          item.handlerType === "OPERATOR"
                            ? "font-medium text-amber-300"
                            : "text-muted",
                        )}
                      >
                        {item.handlerType === "OPERATOR"
                          ? "Ждёт оператора"
                          : `${item.unreadCount} новых`}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 5. Integrations CTA */}
        <section className="overflow-hidden rounded-[22px] border border-border bg-surface p-6 shadow-[var(--academy-panel-shadow)] md:p-8">
          <div className="flex flex-col justify-between gap-7 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-accent">
                <Zap className="h-4 w-4" />
                Каналы под ваш процесс
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-ink">
                Не видите нужный канал?
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Помимо текущих подключений можно собрать интеграцию под ваш канал и настроить
                единый поток обращений с AI и операторами.
              </p>
            </div>
            <Link href="/integrations">
              <Button variant="secondary">
                Обсудить интеграцию
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  detail,
  accent,
}: {
  label: string;
  value: number;
  icon: typeof MessageCircle;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[20px] border p-4 shadow-[var(--academy-panel-shadow)] sm:p-5",
        accent ? "border-accent/30 bg-accent-soft" : "border-border bg-surface",
      )}
    >
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-[13px]",
            accent ? "bg-accent/20 text-accent" : "bg-surface-3 text-muted",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          Live
        </span>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs font-medium text-ink/90">{label}</p>
      <p className="mt-0.5 text-[11px] text-muted">{detail}</p>
    </div>
  );
}

function ChannelCard({
  channel,
  conversations,
}: {
  channel: Channel;
  conversations: ConversationListItem[];
}) {
  const items = conversations.filter((item) => item.channel === channel);
  const unread = items.reduce((sum, item) => sum + item.unreadCount, 0);
  const accent = CHANNEL_ACCENTS[channel];

  return (
    <Link
      href={`/analytics?channel=${channel}`}
      className="group relative overflow-hidden rounded-[20px] border border-border bg-surface-2 p-4 transition hover:border-accent/40 hover:bg-surface-3"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-[13px]", accent)}>
          <ChannelIcon channel={channel} />
        </span>
        <ArrowUpRight className="h-4 w-4 text-muted transition group-hover:text-accent" />
      </div>
      <p className="mt-4 truncate text-sm font-semibold text-ink">{CHANNEL_LABELS[channel]}</p>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-2xl font-semibold tracking-tight text-ink">{items.length}</p>
          <p className="text-[11px] text-muted">диалогов</p>
        </div>
        {unread > 0 ? (
          <Badge tone="warning">{unread} новых</Badge>
        ) : (
          <span className="text-[11px] text-muted">чисто</span>
        )}
      </div>
    </Link>
  );
}

function buildActivity(items: ConversationListItem[]) {
  const now = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    return {
      label: date.toLocaleDateString("ru-RU", { weekday: "short" }).replace(".", ""),
      value: items.filter((item) => {
        const time = new Date(item.lastMessageAt).getTime();
        return time >= date.getTime() && time < next.getTime();
      }).length,
    };
  });
}
