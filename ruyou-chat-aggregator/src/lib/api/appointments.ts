import { api } from "@/lib/api/client";
import type { AppointmentDto } from "@/lib/types";

export function fetchAppointments(params: { date?: string; clientId?: string } = {}) {
  const query = new URLSearchParams();
  if (params.date) query.set("date", params.date);
  if (params.clientId) query.set("clientId", params.clientId);
  return api<{ items: AppointmentDto[] }>(`/api/appointments${query.toString() ? `?${query}` : ""}`);
}
export function fetchSchedulingServices() { return api<{ items: Array<{ id: string; name: string; durationMinutes: number; priceText: string | null; isActive: boolean }> }>("/api/services"); }
export function fetchStaff() { return api<{ items: Array<{ id: string; name: string; specialization: string; isActive: boolean; services: Array<{ serviceId: string }> }> }>("/api/staff"); }
export function fetchAvailability(serviceId: string, date: string, staffId?: string) { const query = new URLSearchParams({ serviceId, date }); if (staffId) query.set("staffId", staffId); return api<{ items: Array<{ startAt: string; endAt: string; time: string; staff: { id: string; name: string; specialization: string } }> }>(`/api/availability?${query}`); }
export function createAppointment(payload: Record<string, unknown>) { return api<AppointmentDto>("/api/appointments", { method: "POST", body: JSON.stringify(payload) }); }
export function rescheduleAppointment(id: string, startAt: string) { return api<AppointmentDto>(`/api/appointments/${id}/reschedule`, { method: "POST", body: JSON.stringify({ startAt }) }); }
export function cancelAppointment(id: string, reason?: string) { return api<AppointmentDto>(`/api/appointments/${id}/cancel`, { method: "POST", body: JSON.stringify({ reason }) }); }
