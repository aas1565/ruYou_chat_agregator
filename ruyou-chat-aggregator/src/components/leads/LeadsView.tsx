"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchLeads } from "@/lib/api/leads";
import { ApiRequestError } from "@/lib/api/client";
import { ChannelIcon } from "@/components/ChannelIcon";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/LoadingState";
import {
  ALL_LEAD_STATUSES,
  CHANNEL_LABELS,
  CHANNELS,
  LEAD_STATUS_LABELS,
} from "@/lib/constants";
import type { LeadListItem } from "@/lib/types";
import { formatDateTime, fullName } from "@/lib/utils";

function statusTone(status: string) {
  if (status === "COMPLETED" || status === "SALE" || status === "BOOKING_CREATED") return "success" as const;
  if (status === "OPERATOR_REQUIRED") return "warning" as const;
  if (status === "NEW") return "accent" as const;
  return "neutral" as const;
}

export function LeadsView() {
  const [items, setItems] = useState<LeadListItem[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [sort, setSort] = useState("updatedAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchLeads({
        q: q || undefined,
        status: status || undefined,
        channel: channel || undefined,
        sort,
        order,
      });
      setItems(result.items);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Не удалось загрузить заявки");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, channel, sort, order]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Заявки</h1>
        <p className="mt-1 text-sm text-muted">Сервисная воронка и воронка продаж в одном списке.</p>
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Поиск по теме или клиенту" />
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Все статусы</option>
          {ALL_LEAD_STATUSES.filter((item, index, arr) => arr.indexOf(item) === index).map((item) => (
            <option key={item} value={item}>
              {LEAD_STATUS_LABELS[item]}
            </option>
          ))}
        </Select>
        <Select value={channel} onChange={(event) => setChannel(event.target.value)}>
          <option value="">Все каналы</option>
          {CHANNELS.map((item) => (
            <option key={item} value={item}>
              {CHANNEL_LABELS[item]}
            </option>
          ))}
        </Select>
        <Select
          value={`${sort}:${order}`}
          onChange={(event) => {
            const [nextSort, nextOrder] = event.target.value.split(":") as [string, "asc" | "desc"];
            setSort(nextSort);
            setOrder(nextOrder);
          }}
        >
          <option value="updatedAt:desc">Сначала изменённые</option>
          <option value="createdAt:desc">Сначала новые</option>
          <option value="shortId:asc">По ID</option>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {loading ? (
          <ListSkeleton rows={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : items.length === 0 ? (
          <EmptyState title="Заявки не найдены" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-2 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Клиент</th>
                  <th className="px-4 py-3">Канал</th>
                  <th className="px-4 py-3">Тема</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Ответственный</th>
                  <th className="px-4 py-3">Создана</th>
                  <th className="px-4 py-3">Изменена</th>
                </tr>
              </thead>
              <tbody>
                {items.map((lead) => (
                  <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                    <td className="px-4 py-3 text-muted">#{lead.shortId}</td>
                    <td className="px-4 py-3">
                      <Link href={`/clients/${lead.client.id}`} className="hover:text-accent">
                        {fullName(lead.client.firstName, lead.client.lastName)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {lead.channel ? <ChannelIcon channel={lead.channel} withLabel /> : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/leads/${lead.id}`} className="font-medium hover:text-accent">
                        {lead.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(lead.status)}>{LEAD_STATUS_LABELS[lead.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted">{lead.assignee?.name || "—"}</td>
                    <td className="px-4 py-3 text-muted">{formatDateTime(lead.createdAt)}</td>
                    <td className="px-4 py-3 text-muted">{formatDateTime(lead.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
