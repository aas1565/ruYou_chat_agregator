import { z } from "zod";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Время должно быть в формате HH:MM");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Дата должна быть в формате YYYY-MM-DD");

export const createServiceSchema = z.object({ name: z.string().trim().min(1).max(120), description: z.string().trim().max(1000).optional().nullable(), durationMinutes: z.coerce.number().int().min(5).max(24 * 60), priceText: z.string().trim().max(120).optional().nullable() });
export const updateServiceSchema = createServiceSchema.partial().extend({ isActive: z.boolean().optional() });
export const createStaffSchema = z.object({ name: z.string().trim().min(1).max(120), specialization: z.string().trim().min(1).max(120), description: z.string().trim().max(1000).optional().nullable(), serviceIds: z.array(z.string().min(1)).optional() });
export const updateStaffSchema = createStaffSchema.partial().extend({ isActive: z.boolean().optional() });
export const workingHoursSchema = z.object({ staffId: z.string().min(1), dayOfWeek: z.coerce.number().int().min(0).max(6), startTime: time, endTime: time, isWorkingDay: z.boolean() });
export const exceptionSchema = z.object({ staffId: z.string().min(1), date, type: z.enum(["DAY_OFF", "CUSTOM_HOURS", "BLOCKED_TIME"]), startTime: time.optional().nullable(), endTime: time.optional().nullable(), reason: z.string().trim().max(500).optional().nullable() });
export const availabilityQuerySchema = z.object({ serviceId: z.string().min(1), date, staffId: z.string().optional(), excludeAppointmentId: z.string().optional() });
export const appointmentListQuerySchema = z.object({ date: date.optional(), clientId: z.string().optional() });
export const createAppointmentSchema = z.object({ clientId: z.string().min(1), leadId: z.string().optional().nullable(), conversationId: z.string().optional().nullable(), serviceId: z.string().min(1), staffId: z.string().min(1), startAt: z.string().datetime(), comment: z.string().trim().max(2000).optional().nullable(), source: z.string().trim().max(40).default("OPERATOR") });
export const rescheduleSchema = z.object({ startAt: z.string().datetime(), reason: z.string().trim().max(500).optional().nullable() });
export const cancelSchema = z.object({ reason: z.string().trim().max(500).optional().nullable() });

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
