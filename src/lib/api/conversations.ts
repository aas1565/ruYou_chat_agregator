import { api } from "@/lib/api/client";
import type { ConversationDetail, ConversationListItem } from "@/lib/types";

export function fetchConversations(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const query = search.toString();
  return api<{ items: ConversationListItem[] }>(`/api/conversations${query ? `?${query}` : ""}`);
}

export function fetchConversation(id: string) {
  return api<ConversationDetail>(`/api/conversations/${id}`);
}

export function sendMessage(id: string, text: string) {
  return api<ConversationDetail>(`/api/conversations/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function createInbound(payload: Record<string, unknown>) {
  return api(`/api/inbound`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
