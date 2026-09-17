"use client";

import Link from "next/link";
import { useState } from "react";
import { ChannelIcon } from "@/components/ChannelIcon";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CHANNEL_LABELS, CLIENT_STATUS_LABELS, FUNNEL_LABELS, LEAD_STATUS_LABELS } from "@/lib/constants";
import type { ClientProfileDto, LeadListItem } from "@/lib/types";
import { formatDate, fullName } from "@/lib/utils";

export function ClientCard({
  client,
  leads,
  onCreateLead,
  onSaveNote,
}: {
  client: ClientProfileDto;
  leads: LeadListItem[];
  onCreateLead: (title: string, funnel: "SERVICE" | "SALES") => Promise<void>;
  onSaveNote: (text: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const channels = Array.from(new Set(client.identities.map((item) => item.channel)));

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white p-4 scrollbar-thin">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Клиент</p>
        <h2 className="mt-1 text-lg font-semibold">{fullName(client.firstName, client.lastName)}</h2>
        <Badge className="mt-2">{CLIENT_STATUS_LABELS[client.status]}</Badge>
      </div>

      <dl className="mt-5 space-y-2 text-sm">
        <Info label="Телефон" value={client.phone} />
        <Info label="Email" value={client.email} />
        <Info label="Telegram" value={client.telegram} />
        <Info label="WhatsApp" value={client.whatsapp} />
        <Info label="VK" value={client.vk} />
        <Info label="Первый канал" value={CHANNEL_LABELS[client.firstChannel]} />
        <Info label="Первое обращение" value={formatDate(client.firstContactAt)} />
        <Info label="Последнее обращение" value={formatDate(client.lastContactAt)} />
        <Info label="Обращений" value={String(client.contactCount)} />
      </dl>

      <div className="mt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">История каналов</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {channels.length === 0 ? (
            <p className="text-sm text-muted">Каналы ещё не зафиксированы</p>
          ) : (
            channels.map((channel) => (
              <span key={channel} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs">
                <ChannelIcon channel={channel} />
                {CHANNEL_LABELS[channel]}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Заявки</p>
        <div className="mt-2 space-y-2">
          {leads.length === 0 ? <p className="text-sm text-muted">Заявок пока нет</p> : null}
          {leads.map((lead) => (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className="block rounded-lg border border-border px-3 py-2 hover:bg-slate-50"
            >
              <p className="text-sm font-medium">{lead.title}</p>
              <p className="mt-1 text-xs text-muted">
                #{lead.shortId} · {LEAD_STATUS_LABELS[lead.status]} · {FUNNEL_LABELS[lead.funnel]}
              </p>
            </Link>
          ))}
        </div>
        <form
          className="mt-3 space-y-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!title.trim()) return;
            setSaving(true);
            try {
              await onCreateLead(title.trim(), "SERVICE");
              setTitle("");
            } finally {
              setSaving(false);
            }
          }}
        >
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Тема заявки" />
          <Button type="submit" size="sm" disabled={!title.trim() || saving} className="w-full">
            Создать заявку
          </Button>
        </form>
      </div>

      <div className="mt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Заметка менеджера</p>
        {client.notes[0] ? (
          <p className="mt-2 text-sm leading-5 text-slate-700">{client.notes[0].text}</p>
        ) : (
          <p className="mt-2 text-sm text-muted">Заметок нет</p>
        )}
        <form
          className="mt-3 space-y-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!note.trim()) return;
            setSaving(true);
            try {
              await onSaveNote(note.trim());
              setNote("");
            } finally {
              setSaving(false);
            }
          }}
        >
          <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Добавить заметку" />
          <Button type="submit" size="sm" variant="secondary" disabled={!note.trim() || saving} className="w-full">
            Сохранить заметку
          </Button>
        </form>
      </div>

      <Link href={`/clients/${client.id}`} className="mt-6 text-sm font-medium text-accent hover:text-accent-hover">
        Открыть профиль клиента
      </Link>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value || "—"}</dd>
    </div>
  );
}
