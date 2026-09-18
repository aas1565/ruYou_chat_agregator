"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { ApiRequestError } from "@/lib/api/client";
import { cancelAppointment, createAppointment, fetchAppointments, fetchAvailability, fetchSchedulingServices, fetchStaff, rescheduleAppointment } from "@/lib/api/appointments";
import { fetchClients } from "@/lib/api/clients";
import type { AppointmentDto } from "@/lib/types";
import { formatDateTimeInZone, formatTimeInZone, fullName } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

function dateKey(value: Date) { return value.toISOString().slice(0, 10); }
function shiftDate(value: string, amount: number) { const date = new Date(`${value}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + amount); return dateKey(date); }
function statusTone(status: string) { return status === "CONFIRMED" ? "success" : status === "CANCELLED" ? "danger" : status === "COMPLETED" ? "neutral" : "warning"; }

export function AppointmentsView() {
  const [date, setDate] = useState(dateKey(new Date()));
  const [items, setItems] = useState<AppointmentDto[]>([]);
  const [services, setServices] = useState<Array<{ id: string; name: string; durationMinutes: number }>>([]);
  const [staff, setStaff] = useState<Array<{ id: string; name: string; specialization: string }>>([]);
  const [clients, setClients] = useState<Array<{ id: string; firstName: string; lastName: string | null }>>([]);
  const [selected, setSelected] = useState<AppointmentDto | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() { setLoading(true); setError(null); try { const [appointments, serviceResponse, staffResponse, clientResponse] = await Promise.all([fetchAppointments({ date }), fetchSchedulingServices(), fetchStaff(), fetchClients({ pageSize: "50" })]); setItems(appointments.items); setServices(serviceResponse.items.filter((item) => item.isActive)); setStaff(staffResponse.items.filter((item) => item.isActive)); setClients(clientResponse.items); } catch (err) { setError(err instanceof ApiRequestError ? err.message : "Не удалось загрузить записи"); } finally { setLoading(false); } }
  useEffect(() => { const timeout = setTimeout(() => void load(), 0); return () => clearTimeout(timeout); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);
  const titleDate = useMemo(() => new Date(`${date}T12:00:00Z`).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }), [date]);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  return <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm text-muted">Расписание</p><h1 className="mt-1 text-2xl font-semibold">Записи</h1></div>
      <Button onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" />Создать запись</Button>
    </div>
    <div className="mt-6 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-3">
      <Button variant="ghost" size="sm" onClick={() => setDate(shiftDate(date, -1))} aria-label="Предыдущий день"><ChevronLeft className="h-4 w-4" /></Button>
      <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-auto" />
      <Button variant="secondary" size="sm" onClick={() => setDate(dateKey(new Date()))}>Сегодня</Button>
      <Button variant="ghost" size="sm" onClick={() => setDate(shiftDate(date, 1))} aria-label="Следующий день"><ChevronRight className="h-4 w-4" /></Button>
      <span className="ml-2 text-sm font-medium">{titleDate}</span>
    </div>
    <section className="mt-4 rounded-xl border border-border bg-surface p-4">
      {items.length === 0 ? <EmptyState title="На этот день записей нет" description="Создайте запись или выберите другую дату." /> : <div className="space-y-2">{items.map((item) => <button key={item.id} type="button" onClick={() => setSelected(item)} className="flex w-full items-center gap-4 rounded-lg border border-border p-3 text-left transition hover:border-accent hover:bg-accent-soft">
        <div className="flex w-20 shrink-0 items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4 text-accent" />{formatTimeInZone(item.startAt, item.timezone)}</div>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.client.name}</p><p className="mt-0.5 text-xs text-muted">{item.service.name} · {item.staff.name}</p></div><Badge tone={statusTone(item.status)}>{item.status === "CANCELLED" ? "Отменена" : item.status === "COMPLETED" ? "Завершена" : "Подтверждена"}</Badge>
      </button>)}</div>}
    </section>
    {selected ? <AppointmentPanel item={selected} onClose={() => setSelected(null)} onChanged={async () => { setSelected(null); await load(); }} /> : null}
    {showCreate ? <CreateAppointmentPanel date={date} services={services} staff={staff} clients={clients} onClose={() => setShowCreate(false)} onCreated={async () => { setShowCreate(false); await load(); }} /> : null}
  </div>;
}

function AppointmentPanel({ item, onClose, onChanged }: { item: AppointmentDto; onClose: () => void; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null);
  return <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/20 p-4 md:items-center"><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-xl"><div className="flex items-start justify-between"><div><p className="text-xs text-muted">Подробности записи</p><h2 className="mt-1 text-lg font-semibold">{item.service.name}</h2></div><button onClick={onClose} aria-label="Закрыть"><X className="h-5 w-5 text-muted" /></button></div><dl className="mt-5 space-y-3 text-sm"><Row label="Клиент"><Link className="text-accent hover:text-accent-hover" href={`/clients/${item.client.id}`}>{item.client.name}</Link></Row><Row label="Телефон">{item.client.phone || "—"}</Row><Row label="Сотрудник">{item.staff.name} · {item.staff.specialization}</Row><Row label="Дата">{new Intl.DateTimeFormat("ru-RU", { timeZone: item.timezone, day: "2-digit", month: "long", year: "numeric" }).format(new Date(item.startAt))}</Row><Row label="Время">{formatDateTimeInZone(item.startAt, item.timezone)} — {formatTimeInZone(item.endAt, item.timezone)}</Row><Row label="Источник">{item.source}</Row><Row label="Статус"><Badge tone={statusTone(item.status)}>{item.status}</Badge></Row>{item.comment ? <Row label="Комментарий">{item.comment}</Row> : null}</dl><div className="mt-5 flex flex-wrap gap-2">{item.lead ? <Link className="text-sm text-accent" href={`/leads/${item.lead.id}`}>Открыть заявку</Link> : null}{item.conversation ? <Link className="text-sm text-accent" href={`/inbox?c=${item.conversation.id}`}>Открыть диалог</Link> : null}{item.status !== "CANCELLED" ? <RescheduleAction item={item} onChanged={onChanged} /> : null}{item.status !== "CANCELLED" ? <Button size="sm" variant="danger" disabled={busy} onClick={async () => { setBusy(true); setMessage(null); try { await cancelAppointment(item.id); await onChanged(); } catch (err) { setMessage(err instanceof ApiRequestError ? err.message : "Не удалось отменить запись"); } finally { setBusy(false); } }}>Отменить</Button> : null}</div>{message ? <p className="mt-3 text-sm text-red-600">{message}</p> : null}</div></div>;
}

function RescheduleAction({ item, onChanged }: { item: AppointmentDto; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState(false); const [date, setDate] = useState(item.startAt.slice(0, 10)); const [slots, setSlots] = useState<Array<{ startAt: string; time: string }>>([]); const [error, setError] = useState<string | null>(null);
  async function load(value: string) { setDate(value); try { const response = await fetchAvailability(item.service.id, value, item.staff.id); setSlots(response.items); setError(null); } catch (err) { setError(err instanceof ApiRequestError ? err.message : "Не удалось загрузить слоты"); } }
  if (!open) return <Button size="sm" variant="secondary" onClick={() => { setOpen(true); void load(date); }}>Перенести</Button>;
  return <div className="basis-full rounded-lg bg-surface-2 p-3"><div className="flex flex-wrap items-end gap-2"><label className="text-xs text-muted">Новая дата<Input className="mt-1" type="date" value={date} onChange={(event) => void load(event.target.value)} /></label><Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Закрыть</Button></div><div className="mt-2 flex flex-wrap gap-2">{slots.map((slot) => <Button key={slot.startAt} size="sm" onClick={async () => { try { await rescheduleAppointment(item.id, slot.startAt); await onChanged(); } catch (err) { setError(err instanceof ApiRequestError ? err.message : "Не удалось перенести запись"); } }}>{slot.time}</Button>)}</div>{error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}</div>;
}

function CreateAppointmentPanel({ date, services, staff, clients, onClose, onCreated }: { date: string; services: Array<{ id: string; name: string; durationMinutes: number }>; staff: Array<{ id: string; name: string; specialization: string }>; clients: Array<{ id: string; firstName: string; lastName: string | null }>; onClose: () => void; onCreated: () => Promise<void> }) {
  const [serviceId, setServiceId] = useState(services[0]?.id || ""); const [staffId, setStaffId] = useState(""); const [selectedSlot, setSelectedSlot] = useState<{ startAt: string; time: string; staff: { id: string; name: string } } | null>(null); const [slots, setSlots] = useState<Array<{ startAt: string; time: string; staff: { id: string; name: string } }>>([]); const [clientId, setClientId] = useState(clients[0]?.id || ""); const [comment, setComment] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!serviceId) return; void fetchAvailability(serviceId, date, staffId || undefined).then((response) => setSlots(response.items)).catch((err) => setError(err instanceof ApiRequestError ? err.message : "Не удалось получить слоты")); }, [serviceId, staffId, date]);
  return <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/20 p-4 md:items-center"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-xl"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Новая запись</h2><button onClick={onClose} aria-label="Закрыть"><X className="h-5 w-5 text-muted" /></button></div><div className="mt-5 grid gap-3 md:grid-cols-2"><label className="text-sm"><span className="mb-1 block text-muted">Клиент</span><Select value={clientId} onChange={(event) => setClientId(event.target.value)}><option value="">Выберите клиента</option>{clients.map((item) => <option key={item.id} value={item.id}>{fullName(item.firstName, item.lastName)}</option>)}</Select></label><label className="text-sm"><span className="mb-1 block text-muted">Услуга</span><Select value={serviceId} onChange={(event) => { setServiceId(event.target.value); setSelectedSlot(null); }}>{services.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.durationMinutes} мин</option>)}</Select></label><label className="text-sm"><span className="mb-1 block text-muted">Сотрудник</span><Select value={staffId} onChange={(event) => { setStaffId(event.target.value); setSelectedSlot(null); }}><option value="">Все подходящие</option>{staff.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></label></div><p className="mt-4 text-sm font-medium">Свободное время</p><div className="mt-2 flex flex-wrap gap-2">{slots.length ? slots.map((slot) => <Button key={`${slot.startAt}-${slot.staff.id}`} size="sm" variant={selectedSlot?.startAt === slot.startAt && selectedSlot.staff.id === slot.staff.id ? "primary" : "secondary"} onClick={() => setSelectedSlot(slot)}>{slot.time} · {slot.staff.name}</Button>) : <p className="text-sm text-muted">Свободных вариантов нет</p>}</div><label className="mt-4 block text-sm"><span className="mb-1 block text-muted">Комментарий</span><Textarea value={comment} onChange={(event) => setComment(event.target.value)} /></label>{error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}<div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Отмена</Button><Button disabled={busy || !clientId || !selectedSlot} onClick={async () => { if (!selectedSlot) return; setBusy(true); setError(null); try { await createAppointment({ clientId, serviceId, staffId: selectedSlot.staff.id, startAt: selectedSlot.startAt, comment }); await onCreated(); } catch (err) { setError(err instanceof ApiRequestError ? err.message : "Не удалось создать запись"); } finally { setBusy(false); } }}>{busy ? "Сохраняем…" : "Создать запись"}</Button></div></div></div>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) { return <div className="flex gap-4"><dt className="w-28 shrink-0 text-muted">{label}</dt><dd>{children}</dd></div>; }
