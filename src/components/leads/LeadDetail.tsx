"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { changeLeadStatus, fetchLead } from "@/lib/api/leads";
import { createNote } from "@/lib/api/clients";
import { ApiRequestError } from "@/lib/api/client";
import { ChannelIcon } from "@/components/ChannelIcon";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  CHANNEL_LABELS,
  FUNNEL_LABELS,
  FUNNEL_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/lib/constants";
import type { LeadDetailDto } from "@/lib/types";
import { formatDateTime, fullName } from "@/lib/utils";

export function LeadDetail({ id }: { id: string }) {
  const [data, setData] = useState<LeadDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchLead(id));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Не удалось загрузить заявку");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error || "Заявка не найдена"} onRetry={() => void load()} />;

  const statuses = FUNNEL_STATUSES[data.lead.funnel];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <Link href="/leads" className="text-sm text-muted hover:text-ink">
        ← К списку заявок
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">#{data.lead.shortId} · {FUNNEL_LABELS[data.lead.funnel]}</p>
          <h1 className="mt-1 text-2xl font-semibold">{data.lead.title}</h1>
        </div>
        <Badge>{LEAD_STATUS_LABELS[data.lead.status]}</Badge>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-white p-5">
          <h2 className="text-sm font-semibold">Клиент</h2>
          <p className="mt-3 text-lg font-medium">{fullName(data.client.firstName, data.client.lastName)}</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Телефон</dt><dd>{data.client.phone || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Email</dt><dd>{data.client.email || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Telegram</dt><dd>{data.client.telegram || "—"}</dd></div>
          </dl>
          <Link href={`/clients/${data.client.id}`} className="mt-4 inline-block text-sm text-accent hover:text-accent-hover">
            Открыть профиль
          </Link>
        </section>

        <section className="rounded-xl border border-border bg-white p-5">
          <h2 className="text-sm font-semibold">Связанный диалог</h2>
          {data.conversation ? (
            <div className="mt-3">
              <ChannelIcon channel={data.conversation.channel} withLabel />
              <p className="mt-2 text-sm">{data.conversation.lastMessageText}</p>
              <p className="mt-1 text-xs text-muted">{CHANNEL_LABELS[data.conversation.channel]} · {formatDateTime(data.conversation.lastMessageAt)}</p>
              <Link href={data.conversation ? `/inbox?c=${data.conversation.id}` : "/inbox"} className="mt-3 inline-block text-sm text-accent hover:text-accent-hover">
                Открыть во входящих
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">Диалог не привязан</p>
          )}
          <div className="mt-5">
            <p className="text-xs text-muted">Ответственный</p>
            <p className="mt-1 text-sm font-medium">{data.lead.assignee?.name || "Не назначен"}</p>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-border bg-white p-5">
        <h2 className="text-sm font-semibold">Статус</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Select
            value={data.lead.status}
            onChange={async (event) => {
              setSaving(true);
              try {
                setData(await changeLeadStatus(data.lead.id, event.target.value as LeadStatus));
              } catch (err) {
                setError(err instanceof ApiRequestError ? err.message : "Не удалось сменить статус");
              } finally {
                setSaving(false);
              }
            }}
            className="max-w-xs"
          >
            {statuses.map((item) => (
              <option key={item} value={item}>
                {LEAD_STATUS_LABELS[item]}
              </option>
            ))}
          </Select>
          {saving ? <span className="text-sm text-muted">Сохраняем…</span> : null}
        </div>
        <ol className="mt-4 space-y-2">
          {data.statusHistory.map((item) => (
            <li key={item.id} className="text-sm text-muted">
              {item.fromStatus ? `${LEAD_STATUS_LABELS[item.fromStatus]} → ` : ""}
              {LEAD_STATUS_LABELS[item.toStatus]} · {item.changedBy?.name || "система"} · {formatDateTime(item.createdAt)}
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-white p-5">
        <h2 className="text-sm font-semibold">Заметки</h2>
        <div className="mt-3 space-y-3">
          {data.notes.map((item) => (
            <div key={item.id} className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-sm">{item.text}</p>
              <p className="mt-1 text-xs text-muted">
                {item.author.name} · {formatDateTime(item.createdAt)}
              </p>
            </div>
          ))}
        </div>
        <form
          className="mt-4 space-y-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!note.trim()) return;
            setSaving(true);
            try {
              await createNote({ text: note.trim(), leadId: data.lead.id });
              setNote("");
              await load();
            } finally {
              setSaving(false);
            }
          }}
        >
          <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Заметка по заявке" />
          <Button type="submit" size="sm" disabled={!note.trim() || saving}>
            Добавить заметку
          </Button>
        </form>
      </section>
    </div>
  );
}
