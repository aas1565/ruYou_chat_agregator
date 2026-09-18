"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createKnowledgeEntry,
  createKnowledgeSourceFromUrl,
  deleteKnowledgeEntry,
  deleteKnowledgeSource,
  fetchKnowledgeEntries,
  fetchKnowledgeSources,
  updateKnowledgeEntry,
  uploadKnowledgeSource,
} from "@/lib/api/knowledge";
import { ApiRequestError } from "@/lib/api/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { ListSkeleton } from "@/components/ui/LoadingState";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  KNOWLEDGE_ENTRY_TYPE_LABELS,
  KNOWLEDGE_ENTRY_TYPES,
  KNOWLEDGE_SOURCE_STATUS_LABELS,
  KNOWLEDGE_SOURCE_TYPE_LABELS,
  type KnowledgeEntryType,
} from "@/lib/constants";
import type { KnowledgeEntryDto, KnowledgeSourceDto } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

type CategoryId =
  | KnowledgeEntryType
  | "SERVICE_PRICE"
  | "SOURCES";

const CATEGORIES: Array<{ id: CategoryId; label: string; types?: KnowledgeEntryType[] }> = [
  { id: "COMPANY", label: "Компания", types: ["COMPANY"] },
  { id: "ADDRESS", label: "Адреса", types: ["ADDRESS"] },
  { id: "WORKING_HOURS", label: "Режим работы", types: ["WORKING_HOURS"] },
  { id: "SERVICE_PRICE", label: "Услуги и цены", types: ["SERVICE", "PRICE"] },
  { id: "EMPLOYEE", label: "Сотрудники", types: ["EMPLOYEE"] },
  { id: "SCHEDULE", label: "Расписание", types: ["SCHEDULE"] },
  { id: "PROMOTION", label: "Акции", types: ["PROMOTION"] },
  { id: "FAQ", label: "FAQ", types: ["FAQ"] },
  { id: "CANCELLATION_POLICY", label: "Правила", types: ["CANCELLATION_POLICY"] },
  { id: "INTERNAL_INSTRUCTION", label: "Инструкции", types: ["INTERNAL_INSTRUCTION"] },
  { id: "SOURCES", label: "Источники" },
];

const PLACEHOLDERS: Partial<Record<KnowledgeEntryType, { title: string; content: string }>> = {
  COMPANY: {
    title: "Название компании",
    content: "Краткое описание и дополнительная информация о компании",
  },
  ADDRESS: {
    title: "Название точки",
    content: "Адрес и дополнительное описание",
  },
  WORKING_HOURS: {
    title: "Режим работы",
    content: "Пн–Пт 09:00–21:00\nСб–Вс выходной",
  },
  SERVICE: {
    title: "Название услуги",
    content: "Описание, стоимость и дополнительная информация",
  },
  PRICE: {
    title: "Позиция прайса",
    content: "от 1 500 ₽ / по договорённости / фиксированная цена",
  },
  EMPLOYEE: {
    title: "Имя сотрудника",
    content: "Должность / специализация, описание, дополнительная информация",
  },
  SCHEDULE: {
    title: "Расписание",
    content: "Дни, время и комментарий для AI",
  },
  PROMOTION: {
    title: "Название акции",
    content: "Описание, срок действия и условия",
  },
  FAQ: {
    title: "Вопрос",
    content: "Ответ",
  },
  CANCELLATION_POLICY: {
    title: "Правило отмены",
    content: "При отмене менее чем за 2 часа необходимо связаться с администратором",
  },
  INTERNAL_INSTRUCTION: {
    title: "Внутренняя инструкция",
    content: "Текст для AI, который не нужно показывать клиенту как отдельное сообщение",
  },
};

function sourceStatusTone(status: string) {
  if (status === "READY") return "success" as const;
  if (status === "FAILED") return "danger" as const;
  return "warning" as const;
}

export function KnowledgeView() {
  const [category, setCategory] = useState<CategoryId>("COMPANY");
  const [entries, setEntries] = useState<KnowledgeEntryDto[]>([]);
  const [sources, setSources] = useState<KnowledgeSourceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeEntryDto | null>(null);
  const [formType, setFormType] = useState<KnowledgeEntryType>("COMPANY");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const currentCategory = CATEGORIES.find((item) => item.id === category)!;
  const filteredEntries = useMemo(() => {
    if (!currentCategory.types) return [];
    return entries.filter((entry) => currentCategory.types!.includes(entry.type));
  }, [entries, currentCategory]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [entriesResult, sourcesResult] = await Promise.all([
        fetchKnowledgeEntries(),
        fetchKnowledgeSources(),
      ]);
      setEntries(entriesResult.items);
      setSources(sourcesResult.items);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Не удалось загрузить базу знаний");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, []);

  function openCreate(type?: KnowledgeEntryType) {
    const nextType =
      type ||
      currentCategory.types?.[0] ||
      "COMPANY";
    setEditing(null);
    setFormType(nextType);
    setTitle("");
    setContent("");
    setFormOpen(true);
  }

  function openEdit(entry: KnowledgeEntryDto) {
    setEditing(entry);
    setFormType(entry.type);
    setTitle(entry.title);
    setContent(entry.content);
    setFormOpen(true);
  }

  async function saveEntry() {
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateKnowledgeEntry(editing.id, {
          type: formType,
          title,
          content,
        });
      } else {
        await createKnowledgeEntry({
          type: formType,
          title,
          content,
          isActive: true,
        });
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Не удалось сохранить запись");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(entry: KnowledgeEntryDto) {
    try {
      await updateKnowledgeEntry(entry.id, { isActive: !entry.isActive });
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Не удалось обновить запись");
    }
  }

  async function removeEntry(entry: KnowledgeEntryDto) {
    if (!window.confirm(`Удалить запись «${entry.title}»?`)) return;
    try {
      await deleteKnowledgeEntry(entry.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Не удалось удалить запись");
    }
  }

  async function submitUrl() {
    setSaving(true);
    setError(null);
    try {
      await createKnowledgeSourceFromUrl({
        url,
        name: sourceName || undefined,
      });
      setUrl("");
      setSourceName("");
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Не удалось добавить URL");
    } finally {
      setSaving(false);
    }
  }

  async function submitFile() {
    if (!file) return;
    setSaving(true);
    setError(null);
    try {
      await uploadKnowledgeSource(file, sourceName || undefined);
      setFile(null);
      setSourceName("");
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Не удалось загрузить файл");
    } finally {
      setSaving(false);
    }
  }

  async function removeSource(source: KnowledgeSourceDto) {
    if (!window.confirm(`Удалить источник «${source.name}»?`)) return;
    try {
      await deleteKnowledgeSource(source.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Не удалось удалить источник");
    }
  }

  const placeholder = PLACEHOLDERS[formType];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">База знаний</h1>
        <p className="mt-1 text-sm text-muted">
          Информация, которую AI использует для ответов клиентам.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setCategory(item.id);
              setFormOpen(false);
            }}
            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
              category === item.id
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-surface text-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mb-4">
          <ErrorState message={error} onRetry={() => void load()} />
        </div>
      ) : null}

      {loading ? (
        <ListSkeleton rows={6} />
      ) : category === "SOURCES" ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">Загрузить файл</h2>
            <p className="mt-1 text-sm text-muted">PDF, DOCX или XLSX до 10 МБ.</p>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <Input
                type="file"
                accept=".pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <Input
                value={sourceName}
                onChange={(event) => setSourceName(event.target.value)}
                placeholder="Название источника (необязательно)"
              />
              <Button disabled={!file || saving} onClick={() => void submitFile()}>
                Загрузить
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">Добавить URL</h2>
            <p className="mt-1 text-sm text-muted">Одна конкретная страница http/https.</p>
            <div className="mt-3 grid gap-3 md:grid-cols-[1.4fr_1fr_auto]">
              <Input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://company.ru/services"
              />
              <Input
                value={sourceName}
                onChange={(event) => setSourceName(event.target.value)}
                placeholder="Название (необязательно)"
              />
              <Button disabled={!url.trim() || saving} onClick={() => void submitUrl()}>
                Добавить
              </Button>
            </div>
          </div>

          {sources.length === 0 ? (
            <EmptyState
              title="Источников пока нет"
              description="Загрузите документ или добавьте URL страницы."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border bg-surface-2 text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Источник</th>
                    <th className="px-4 py-3 font-medium">Тип</th>
                    <th className="px-4 py-3 font-medium">Статус</th>
                    <th className="px-4 py-3 font-medium">Фрагменты</th>
                    <th className="px-4 py-3 font-medium">Обновлён</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {sources.map((source) => (
                    <tr key={source.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink">{source.name}</div>
                        <div className="mt-0.5 text-xs text-muted">
                          {source.originalFileName || source.url || "—"}
                        </div>
                        {source.errorMessage ? (
                          <div className="mt-1 text-xs text-red-600">{source.errorMessage}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">{KNOWLEDGE_SOURCE_TYPE_LABELS[source.type]}</td>
                      <td className="px-4 py-3">
                        <Badge tone={sourceStatusTone(source.status)}>
                          {KNOWLEDGE_SOURCE_STATUS_LABELS[source.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{source.chunkCount}</td>
                      <td className="px-4 py-3 text-muted">{formatDateTime(source.updatedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="danger" size="sm" onClick={() => void removeSource(source)}>
                          Удалить
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {currentCategory.label}: быстро добавьте и измените информацию для AI.
            </p>
            <div className="flex flex-wrap gap-2">
              {currentCategory.id === "SERVICE_PRICE" ? (
                <>
                  <Button size="sm" variant="secondary" onClick={() => openCreate("SERVICE")}>
                    Добавить услугу
                  </Button>
                  <Button size="sm" onClick={() => openCreate("PRICE")}>
                    Добавить цену
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => openCreate()}>
                  Добавить запись
                </Button>
              )}
            </div>
          </div>

          {formOpen ? (
            <div className="rounded-xl border border-border bg-surface p-4">
              <h2 className="text-sm font-semibold">
                {editing ? "Изменить запись" : "Новая запись"}
              </h2>
              <div className="mt-3 grid gap-3">
                {(currentCategory.id === "SERVICE_PRICE" || !editing) && (
                  <Select
                    value={formType}
                    onChange={(event) => setFormType(event.target.value as KnowledgeEntryType)}
                  >
                    {(currentCategory.types ?? KNOWLEDGE_ENTRY_TYPES).map((type) => (
                      <option key={type} value={type}>
                        {KNOWLEDGE_ENTRY_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </Select>
                )}
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={placeholder?.title || "Заголовок"}
                />
                <Textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder={placeholder?.content || "Содержание"}
                  className="min-h-[120px]"
                />
                <div className="flex gap-2">
                  <Button
                    disabled={saving || !title.trim() || !content.trim()}
                    onClick={() => void saveEntry()}
                  >
                    Сохранить
                  </Button>
                  <Button variant="secondary" onClick={() => setFormOpen(false)}>
                    Отмена
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {filteredEntries.length === 0 ? (
            <EmptyState
              title="Записей пока нет"
              description="Добавьте первую запись в эту категорию."
            />
          ) : (
            <div className="space-y-3">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-border bg-surface p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-ink">{entry.title}</h3>
                        <Badge tone={entry.isActive ? "success" : "neutral"}>
                          {entry.isActive ? "Активна" : "Отключена"}
                        </Badge>
                        <Badge tone="accent">{KNOWLEDGE_ENTRY_TYPE_LABELS[entry.type]}</Badge>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-ink/90">{entry.content}</p>
                      <p className="mt-2 text-xs text-muted">
                        Обновлено {formatDateTime(entry.updatedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(entry)}>
                        Изменить
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void toggleActive(entry)}>
                        {entry.isActive ? "Отключить" : "Включить"}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => void removeEntry(entry)}>
                        Удалить
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
