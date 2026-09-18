"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, BarChart3, MessageCircle } from "lucide-react";
import { ChannelIcon } from "@/components/ChannelIcon";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ApiRequestError } from "@/lib/api/client";
import { fetchConversations } from "@/lib/api/conversations";
import { CHANNEL_LABELS, CHANNELS, type Channel } from "@/lib/constants";
import type { ConversationListItem } from "@/lib/types";
import { fullName, formatRelativeTime, truncate } from "@/lib/utils";

export function AnalyticsView({ initialChannel }: { initialChannel?: string }) {
  const [channel, setChannel] = useState<Channel | "">(CHANNELS.includes(initialChannel as Channel) ? initialChannel as Channel : "");
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { const timeout = setTimeout(() => { void fetchConversations({}).then((result) => setItems(result.items)).catch((err) => setError(err instanceof ApiRequestError ? err.message : "Не удалось загрузить аналитику")).finally(() => setLoading(false)); }, 0); return () => clearTimeout(timeout); }, []);
  const filtered = channel ? items.filter((item) => item.channel === channel) : items;
  const unread = filtered.reduce((sum, item) => sum + item.unreadCount, 0);
  const operator = filtered.filter((item) => item.handlerType === "OPERATOR").length;
  const channelSummary = useMemo(() => CHANNELS.map((item) => ({ channel: item, count: items.filter((row) => row.channel === item).length })).filter((item) => item.count > 0), [items]);
  if (loading) return <LoadingState label="Собираем аналитику…" />;
  return <div className="mx-auto max-w-6xl px-4 py-6 md:px-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><Link href="/home" className="text-sm text-muted hover:text-ink"><ArrowLeft className="mr-1 inline h-4 w-4" />На главную</Link><h1 className="mt-3 text-3xl font-semibold tracking-tight">Аналитика каналов</h1><p className="mt-1 text-sm text-muted">Открывается с главной по клику на канал и не занимает место в основном меню.</p></div><div className="rounded-xl bg-accent-soft p-3 text-accent"><BarChart3 className="h-6 w-6" /></div></div>{error ? <p className="mt-6 text-sm text-red-600">{error}</p> : <><div className="mt-6 flex flex-wrap gap-2">{channelSummary.map((item) => <button key={item.channel} onClick={() => setChannel(channel === item.channel ? "" : item.channel)} className={`rounded-full border px-3 py-1.5 text-sm transition ${channel === item.channel ? "border-accent bg-accent text-white" : "border-border bg-surface hover:border-accent"}`}><ChannelIcon channel={item.channel} withLabel className={channel === item.channel ? "text-white" : ""} /></button>)}</div><div className="mt-6 grid gap-4 sm:grid-cols-3"><Stat label="Диалогов" value={filtered.length} /><Stat label="Непрочитано" value={unread} accent /><Stat label="Ждут оператора" value={operator} /></div><section className="mt-6 rounded-2xl border border-border bg-surface p-5"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.16em] text-muted">Лента</p><h2 className="mt-1 text-xl font-semibold">{channel ? CHANNEL_LABELS[channel] : "Все каналы"}</h2></div><Link href="/inbox" className="text-sm font-medium text-accent">Перейти в обращения <ArrowUpRight className="ml-1 inline h-4 w-4" /></Link></div>{filtered.length === 0 ? <EmptyState title="Нет данных по каналу" /> : <div className="mt-4 divide-y divide-border">{filtered.slice(0, 12).map((item) => <Link key={item.id} href={`/inbox?c=${item.id}`} className="flex items-center gap-4 py-3 hover:bg-surface-2"><MessageCircle className="h-4 w-4 shrink-0 text-accent" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{fullName(item.client.firstName, item.client.lastName)}</p><p className="truncate text-sm text-muted">{truncate(item.lastMessageText, 100)}</p></div><div className="text-right"><p className="text-xs text-muted">{formatRelativeTime(item.lastMessageAt)}</p>{item.unreadCount > 0 ? <Badge tone="warning">{item.unreadCount}</Badge> : null}</div></Link>)}</div>}</section></>}</div>;
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) { return <div className={`rounded-2xl border p-5 ${accent ? "border-accent/30 bg-accent-soft" : "border-border bg-surface"}`}><p className="text-sm text-muted">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div>; }
