import { prisma } from "@/lib/db";

export async function listStaff(includeInactive = true) {
  return prisma.staffMember.findMany({ where: includeInactive ? undefined : { isActive: true }, orderBy: { name: "asc" }, include: { services: { include: { service: true } }, workingHours: { orderBy: { dayOfWeek: "asc" } }, exceptions: { orderBy: { date: "asc" } } } });
}

export async function createStaff(data: { name: string; specialization: string; description?: string | null; serviceIds?: string[] }) {
  return prisma.staffMember.create({ data: { name: data.name, specialization: data.specialization, description: data.description ?? null, services: { create: (data.serviceIds ?? []).map((serviceId) => ({ serviceId })) } }, include: { services: true } });
}

export async function updateStaff(id: string, data: { name?: string; specialization?: string; description?: string | null; isActive?: boolean; serviceIds?: string[] }) {
  const existing = await prisma.staffMember.findUnique({ where: { id } });
  if (!existing) return null;
  return prisma.$transaction(async (tx) => {
    if (data.serviceIds) {
      await tx.staffService.deleteMany({ where: { staffId: id } });
      if (data.serviceIds.length) await tx.staffService.createMany({ data: data.serviceIds.map((serviceId) => ({ staffId: id, serviceId })) });
    }
    return tx.staffMember.update({ where: { id }, data: { name: data.name, specialization: data.specialization, description: data.description, isActive: data.isActive }, include: { services: true } });
  });
}

export async function deleteStaff(id: string) {
  const existing = await prisma.staffMember.findUnique({ where: { id } });
  if (!existing) return null;
  return prisma.staffMember.update({ where: { id }, data: { isActive: false } });
}

export async function upsertWorkingHours(data: { staffId: string; dayOfWeek: number; startTime: string; endTime: string; isWorkingDay: boolean }) {
  return prisma.staffWorkingHours.upsert({ where: { staffId_dayOfWeek: { staffId: data.staffId, dayOfWeek: data.dayOfWeek } }, update: data, create: data });
}

export async function createScheduleException(data: { staffId: string; date: string; type: string; startTime?: string | null; endTime?: string | null; reason?: string | null }) {
  return prisma.scheduleException.create({ data });
}
