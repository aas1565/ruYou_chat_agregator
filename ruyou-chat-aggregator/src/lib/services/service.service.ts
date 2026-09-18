import { prisma } from "@/lib/db";

export async function listServices(includeInactive = true) {
  return prisma.service.findMany({ where: includeInactive ? undefined : { isActive: true }, orderBy: { name: "asc" }, include: { staffServices: { include: { staff: true } } } });
}

export async function createService(data: { name: string; description?: string | null; durationMinutes: number; priceText?: string | null }) {
  return prisma.service.create({ data });
}

export async function updateService(id: string, data: { name?: string; description?: string | null; durationMinutes?: number; priceText?: string | null; isActive?: boolean }) {
  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) return null;
  return prisma.service.update({ where: { id }, data });
}

export async function deleteService(id: string) {
  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) return null;
  return prisma.service.update({ where: { id }, data: { isActive: false } });
}
