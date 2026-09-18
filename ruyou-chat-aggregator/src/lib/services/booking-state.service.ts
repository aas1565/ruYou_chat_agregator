import { prisma } from "@/lib/db";

export type BookingStateStatus = "COLLECTING" | "SLOT_OFFERED" | "AWAITING_CONFIRMATION" | "COMPLETED" | "CANCELLED";

export async function getActiveBookingState(conversationId: string) {
  const state = await prisma.conversationBookingState.findUnique({ where: { conversationId } });
  if (!state) return null;
  if (state.expiresAt <= new Date() && !["COMPLETED", "CANCELLED"].includes(state.status)) {
    await prisma.conversationBookingState.update({ where: { id: state.id }, data: { status: "CANCELLED" } });
    return null;
  }
  return state;
}

export async function saveBookingState(params: { conversationId: string; clientId: string; serviceId?: string | null; staffId?: string | null; requestedDate?: string | null; selectedStartAt?: Date | null; appointmentId?: string | null; status: BookingStateStatus }) {
  return prisma.conversationBookingState.upsert({ where: { conversationId: params.conversationId }, update: { clientId: params.clientId, serviceId: params.serviceId ?? null, staffId: params.staffId ?? null, requestedDate: params.requestedDate ?? null, selectedStartAt: params.selectedStartAt ?? null, appointmentId: params.appointmentId ?? null, status: params.status, expiresAt: new Date(Date.now() + 30 * 60_000) }, create: { conversationId: params.conversationId, clientId: params.clientId, serviceId: params.serviceId ?? null, staffId: params.staffId ?? null, requestedDate: params.requestedDate ?? null, selectedStartAt: params.selectedStartAt ?? null, appointmentId: params.appointmentId ?? null, status: params.status, expiresAt: new Date(Date.now() + 30 * 60_000) } });
}

export async function clearBookingState(conversationId: string, status: "COMPLETED" | "CANCELLED" = "CANCELLED") {
  const state = await prisma.conversationBookingState.findUnique({ where: { conversationId } });
  if (!state) return null;
  return prisma.conversationBookingState.update({ where: { id: state.id }, data: { status, expiresAt: new Date() } });
}
