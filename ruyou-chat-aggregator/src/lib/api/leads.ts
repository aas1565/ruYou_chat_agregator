import { api } from "@/lib/api/client";
import type { LeadDetailDto, LeadListItem, Paginated } from "@/lib/types";

export function fetchLeads(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const query = search.toString();
  return api<Paginated<LeadListItem>>(`/api/leads${query ? `?${query}` : ""}`);
}

export function fetchLead(id: string) {
  return api<LeadDetailDto>(`/api/leads/${id}`);
}

export function createLead(payload: {
  clientId: string;
  conversationId?: string;
  title: string;
  funnel?: string;
}) {
  return api<LeadDetailDto>("/api/leads", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function changeLeadStatus(id: string, status: string) {
  return api<LeadDetailDto>(`/api/leads/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}
