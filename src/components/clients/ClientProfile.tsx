"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchClient, updateClient, createNote } from "@/lib/api/clients";
import { ApiRequestError } from "@/lib/api/client";
import { ChannelIcon } from "@/components/ChannelIcon";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  CHANNEL_LABELS,
  CLIENT_STATUS_LABELS,
  FUNNEL_LABELS,
  LEAD_STATUS_LABELS,
} from "@/lib/constants";
import type { ClientProfileDto } from "@/lib/types";
import { formatDate, formatDateTime, fullName } from "@/lib/utils";

export function ClientProfile({ id }: { id: string }) {
  const [client, setClient] = useState<ClientProfileDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setClient(await fetchClient(id));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Не удалось загрузить клиента");
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
  if (error || !client) return <ErrorState message={error || "Клиент не найден"} onRetry={() => void load()} />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <Link href="/clients" className="text-sm text-muted hover:text-ink">
        ← К списку клиентов
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{fullName(client.firstName, client.lastName)}</h1>
          <p className="mt-1 text-sm text-muted">
            Первый канал: {CHANNEL_LABELS[client.firstChannel]} · обращений: {client.contactCount}
          </p>
        </div>
        <Badge tone={client.status === "ACTIVE" ? "success" : "neutral"}>
          {CLIENT_STATUS_LABELS[client.status]}
        </Badge>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-xl border border-border bg-white p-5">
          <h2 className="text-sm font-semibold">Контактные данные</h2>
          <form
            className="mt-4 grid gap-3 md:grid-cols-2"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              setSaving(true);
              try {
                const updated = await updateClient(client.id, {
                  firstName: String(form.get("firstName")),
                  lastName: String(form.get("lastName") || ""),
                  phone: String(form.get("phone") || ""),
                  email: String(form.get("email") || ""),
                  telegram: String(form.get("telegram") || ""),
                  whatsapp: String(form.get("whatsapp") || ""),
                  vk: String(form.get("vk") || ""),
                });
                setClient(updated);
              } catch (err) {
                setError(err instanceof ApiRequestError ? err.message : "Не удалось сохранить");
              } finally {
                setSaving(false);
              }
            }}
          >
            <Field name="firstName" label="Имя" defaultValue={client.firstName} />
            <Field name="lastName" label="Фамилия" defaultValue={client.lastName || ""} />
            <Field name="phone" label="Телефон" defaultValue={client.phone || ""} />
            <Field name="email" label="Email" defaultValue={client.email || ""} />
            <Field name="telegram" label="Telegram" defaultValue={client.telegram || ""} />
            <Field name="whatsapp" label="WhatsApp" defaultValue={client.whatsapp || ""} />
            <Field name="vk" label="VK" defaultValue={client.vk || ""} />
            <div className="md:col-span-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Сохранение…" : "Сохранить"}
              </Button>
            </div>
          </form>
          <p className="mt-4 text-xs text-muted">
            Первое обращение: {formatDate(client.firstContactAt)} · последнее: {formatDate(client.lastContactAt)}
          </p>
        </section>

        <section className="rounded-xl border border-border bg-white p-5">
          <h2 className="text-sm font-semibold">Каналы</h2>
          <div className="mt-3 space-y-2">
            {client.identities.map((identity) => (
              <div key={identity.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <ChannelIcon channel={identity.channel} withLabel />
                <span className="text-xs text-muted">{identity.externalId}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-border bg-white p-5">
        <h2 className="text-sm font-semibold">История диалогов</h2>
        <div className="mt-3 divide-y divide-border">
          {client.conversations.map((conversation) => (
            <Link key={conversation.id} href={`/inbox?c=${conversation.id}`} className="flex items-center justify-between gap-4 py-3 hover:bg-slate-50">
              <div>
                <p className="text-sm font-medium">{conversation.lastMessageText}</p>
                <p className="mt-1 text-xs text-muted">
                  {CHANNEL_LABELS[conversation.channel]} · {formatDateTime(conversation.lastMessageAt)}
                </p>
              </div>
              {conversation.unreadCount > 0 ? <Badge tone="danger">{conversation.unreadCount}</Badge> : null}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-white p-5">
        <h2 className="text-sm font-semibold">Заявки</h2>
        <div className="mt-3 space-y-2">
          {client.leads.length === 0 ? <p className="text-sm text-muted">Заявок нет</p> : null}
          {client.leads.map((lead) => (
            <Link key={lead.id} href={`/leads/${lead.id}`} className="block rounded-lg border border-border px-3 py-2 hover:bg-slate-50">
              <p className="text-sm font-medium">{lead.title}</p>
              <p className="text-xs text-muted">
                #{lead.shortId} · {LEAD_STATUS_LABELS[lead.status]} · {FUNNEL_LABELS[lead.funnel]}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-dashed border-border bg-white p-5">
          <h2 className="text-sm font-semibold">Записи</h2>
          <p className="mt-2 text-sm text-muted">Раздел появится на следующем этапе.</p>
        </section>
        <section className="rounded-xl border border-dashed border-border bg-white p-5">
          <h2 className="text-sm font-semibold">Сделки</h2>
          <p className="mt-2 text-sm text-muted">Раздел появится на следующем этапе.</p>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-border bg-white p-5">
        <h2 className="text-sm font-semibold">Заметки</h2>
        <div className="mt-3 space-y-3">
          {client.notes.map((item) => (
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
              await createNote({ text: note.trim(), clientId: client.id });
              setNote("");
              await load();
            } finally {
              setSaving(false);
            }
          }}
        >
          <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Новая заметка" />
          <Button type="submit" size="sm" disabled={!note.trim() || saving}>
            Добавить заметку
          </Button>
        </form>
      </section>
    </div>
  );
}

function Field({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-muted">{label}</span>
      <Input name={name} defaultValue={defaultValue} />
    </label>
  );
}
