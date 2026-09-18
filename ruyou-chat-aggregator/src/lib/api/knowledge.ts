import { api } from "@/lib/api/client";
import type { KnowledgeEntryDto, KnowledgeSourceDto } from "@/lib/types";

export function fetchKnowledgeEntries(params: Record<string, string | undefined> = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const query = search.toString();
  return api<{ items: KnowledgeEntryDto[] }>(`/api/knowledge${query ? `?${query}` : ""}`);
}

export function createKnowledgeEntry(payload: {
  type: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown> | null;
  isActive?: boolean;
}) {
  return api<KnowledgeEntryDto>("/api/knowledge", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateKnowledgeEntry(
  id: string,
  payload: {
    type?: string;
    title?: string;
    content?: string;
    metadata?: Record<string, unknown> | null;
    isActive?: boolean;
  },
) {
  return api<KnowledgeEntryDto>(`/api/knowledge/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteKnowledgeEntry(id: string) {
  return api<void>(`/api/knowledge/${id}`, { method: "DELETE" });
}

export function fetchKnowledgeSources() {
  return api<{ items: KnowledgeSourceDto[] }>("/api/knowledge/sources");
}

export function createKnowledgeSourceFromUrl(payload: { url: string; name?: string }) {
  return api<KnowledgeSourceDto>("/api/knowledge/sources", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadKnowledgeSource(file: File, name?: string) {
  const form = new FormData();
  form.append("file", file);
  if (name) form.append("name", name);

  const response = await fetch("/api/knowledge/sources", {
    method: "POST",
    body: form,
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.location.assign("/login");
    }
    let message = "Не удалось загрузить файл";
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) message = payload.error;
    } catch {
      // ignore
    }
    const { ApiRequestError } = await import("@/lib/api/client");
    throw new ApiRequestError(message, response.status);
  }

  return (await response.json()) as KnowledgeSourceDto;
}

export function deleteKnowledgeSource(id: string) {
  return api<void>(`/api/knowledge/sources/${id}`, { method: "DELETE" });
}
