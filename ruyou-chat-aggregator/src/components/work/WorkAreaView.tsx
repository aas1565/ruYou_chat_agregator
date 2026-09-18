"use client";

import { useState } from "react";
import { AppointmentsView } from "@/components/appointments/AppointmentsView";
import { LeadsView } from "@/components/leads/LeadsView";

export function WorkAreaView() {
  const [tab, setTab] = useState<"appointments" | "leads">("appointments");
  return <div><div className="sticky top-0 z-10 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur md:px-8"><div className="mx-auto flex max-w-6xl items-center gap-2 rounded-xl border border-border bg-surface p-1"><button onClick={() => setTab("appointments")} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${tab === "appointments" ? "bg-accent text-white" : "text-muted hover:text-ink"}`}>Записи</button><button onClick={() => setTab("leads")} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${tab === "leads" ? "bg-accent text-white" : "text-muted hover:text-ink"}`}>Заявки</button></div></div>{tab === "appointments" ? <AppointmentsView /> : <LeadsView />}</div>;
}
