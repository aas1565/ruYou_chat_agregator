"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchClients } from "@/lib/api/clients";
import { ApiRequestError } from "@/lib/api/client";
import { ChannelIcon } from "@/components/ChannelIcon";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Pagination } from "@/components/ui/Pagination";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  CHANNEL_LABELS,
  CHANNELS,
  CLIENT_STATUS_LABELS,
  CLIENT_STATUSES,
} from "@/lib/constants";
import type { ClientListItem } from "@/lib/types";
import { formatDateTime, fullName } from "@/lib/utils";

export function ClientsView() {
  const [items, setItems] = useState<ClientListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("lastContactAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 10;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchClients({
        q: q || undefined,
        channel: channel || undefined,
        status: status || undefined,
        sort,
        order,
        page: String(page),
        pageSize: String(pageSize),
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Не удалось загрузить клиентов");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, channel, status, sort, order, page]);

  function toggleSort(next: string) {
    if (sort === next) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSort(next);
      setOrder("desc");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Клиенты</h1>
        <p className="mt-1 text-sm text-muted">Единая карточка на все каналы обращения.</p>
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <Input
          value={q}
          onChange={(event) => {
            setPage(1);
            setQ(event.target.value);
          }}
          placeholder="Поиск по имени, телефону, email"
        />
        <Select
          value={channel}
          onChange={(event) => {
            setPage(1);
            setChannel(event.target.value);
          }}
        >
          <option value="">Все каналы</option>
          {CHANNELS.map((item) => (
            <option key={item} value={item}>
              {CHANNEL_LABELS[item]}
            </option>
          ))}
        </Select>
        <Select
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value);
          }}
        >
          <option value="">Все статусы</option>
          {CLIENT_STATUSES.map((item) => (
            <option key={item} value={item}>
              {CLIENT_STATUS_LABELS[item]}
            </option>
          ))}
        </Select>
        <Select value={`${sort}:${order}`} onChange={(event) => {
          const [nextSort, nextOrder] = event.target.value.split(":") as [string, "asc" | "desc"];
          setSort(nextSort);
          setOrder(nextOrder);
        }}>
          <option value="lastContactAt:desc">Сначала новые обращения</option>
          <option value="lastContactAt:asc">Сначала старые обращения</option>
          <option value="firstName:asc">Имя А–Я</option>
          <option value="contactCount:desc">Больше обращений</option>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {loading ? (
          <ListSkeleton rows={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : items.length === 0 ? (
          <EmptyState title="Клиенты не найдены" description="Измените поиск или фильтры." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-2 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort("firstName")}>Имя</th>
                  <th className="px-4 py-3">Телефон</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Основной канал</th>
                  <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort("lastContactAt")}>Последнее обращение</th>
                  <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort("contactCount")}>Обращений</th>
                  <th className="px-4 py-3">Статус</th>
                </tr>
              </thead>
              <tbody>
                {items.map((client) => (
                  <tr key={client.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                    <td className="px-4 py-3">
                      <Link href={`/clients/${client.id}`} className="font-medium hover:text-accent">
                        {fullName(client.firstName, client.lastName)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{client.phone || "—"}</td>
                    <td className="px-4 py-3 text-muted">{client.email || "—"}</td>
                    <td className="px-4 py-3">
                      <ChannelIcon channel={client.firstChannel} withLabel />
                    </td>
                    <td className="px-4 py-3 text-muted">{formatDateTime(client.lastContactAt)}</td>
                    <td className="px-4 py-3">{client.contactCount}</td>
                    <td className="px-4 py-3">
                      <Badge tone={client.status === "ACTIVE" ? "success" : "neutral"}>
                        {CLIENT_STATUS_LABELS[client.status]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}
