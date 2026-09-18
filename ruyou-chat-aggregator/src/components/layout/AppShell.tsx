"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Briefcase,
  CalendarDays,
  ClipboardList,
  Home,
  Inbox,
  LogOut,
  Menu,
  Plug,
  Settings,
  Users,
  X,
  BarChart3,
  ChevronRight,
  CircleHelp,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/api/auth";
import type { PublicUser } from "@/lib/types";

const ICONS = {
  home: Home,
  inbox: Inbox,
  users: Users,
  clipboard: ClipboardList,
  calendar: CalendarDays,
  briefcase: Briefcase,
  chart: BarChart3,
  alert: AlertCircle,
  book: BookOpen,
  plug: Plug,
  settings: Settings,
};

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const Icon = ICONS[item.icon];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-[13px] font-medium transition-all",
              active
                ? "bg-sidebar-active text-sidebar-text"
                : "text-muted hover:bg-white/[0.04] hover:text-ink",
            )}
          >
            {active ? (
              <span className="absolute -left-3 h-5 w-0.5 rounded-full bg-accent" />
            ) : null}
            <Icon
              className={cn(
                "h-4 w-4 stroke-[1.7] transition",
                active ? "text-sidebar-text" : "text-muted/70 group-hover:text-ink",
              )}
            />
            <span className="flex-1">{item.label}</span>
            {active ? <ChevronRight className="h-3.5 w-3.5 text-muted" /> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ user, children }: { user: PublicUser; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="workspace-shell flex min-h-screen overflow-hidden bg-bg">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-hidden border-r border-border bg-sidebar lg:flex">
        <div className="px-5 pb-5 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-sm font-bold text-[var(--primary-foreground)] shadow-[0_0_24px_rgb(132_191_255_/_0.25)]">
              R
            </div>
            <div>
              <p className="text-[15px] font-semibold tracking-tight text-ink">Ruyou</p>
              <p className="mt-0.5 text-[11px] text-muted">communication OS</p>
            </div>
          </div>
        </div>
        <div className="px-5 pb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted/60">
          Рабочее пространство
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <NavLinks />
        </div>
        <div className="mx-3 mb-3 rounded-2xl border border-border bg-surface-2 p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
              {user.name.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-ink">{user.name}</p>
              <p className="truncate text-[11px] text-muted">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 inline-flex items-center gap-2 text-xs text-muted transition hover:text-ink"
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </button>
        </div>
        <div className="border-t border-border px-4 py-3">
          <button className="flex w-full items-center gap-2 text-xs text-muted transition hover:text-ink">
            <CircleHelp className="h-3.5 w-3.5" /> Центр помощи
          </button>
        </div>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-label="Закрыть меню"
          />
          <aside className="relative z-50 flex h-full w-72 flex-col border-r border-border bg-sidebar shadow-xl">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-2 text-ink">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-xs font-bold text-[var(--primary-foreground)]">
                  R
                </div>
                <p className="font-semibold">Ruyou</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-muted hover:bg-white/5 hover:text-ink"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <div className="border-t border-border p-4">
              <p className="text-sm font-medium text-ink">{user.name}</p>
              <button onClick={handleLogout} className="mt-3 text-sm text-muted">
                Выйти
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur lg:hidden">
          <button
            onClick={() => setOpen(true)}
            className="rounded-xl p-2 text-muted hover:bg-white/5 hover:text-ink"
            aria-label="Меню"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="font-semibold tracking-tight text-ink">Ruyou</p>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
