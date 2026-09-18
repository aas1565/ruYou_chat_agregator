import { api } from "@/lib/api/client";
import type { ClientProfileDto, Paginated, ClientListItem } from "@/lib/types";

export function fetchClients(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const query = search.toString();
  return api<Paginated<ClientListItem>>(`/api/clients${query ? `?${query}` : ""}`);
}

export function fetchClient(id: string) {
  return api<ClientProfileDto>(`/api/clients/${id}`);
}

export function updateClient(id: string, payload: Record<string, unknown>) {
  return api<ClientProfileDto>(`/api/clients/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function searchClient(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  return api<{ client: ClientProfileDto | null }>(`/api/clients/search?${search.toString()}`);
}

export function createNote(payload: { text: string; clientId?: string; leadId?: string }) {
  return api("/api/notes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
