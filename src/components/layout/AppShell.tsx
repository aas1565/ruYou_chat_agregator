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
    <nav className="flex flex-col gap-0.5">
      {NAV_ITEMS.map((item) => {
        const Icon = ICONS[item.icon];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
              active ? "bg-accent-soft font-medium text-accent" : "text-slate-600 hover:bg-slate-50 hover:text-ink",
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1">{item.label}</span>
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
    <div className="min-h-screen bg-bg">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-border bg-white lg:flex lg:flex-col">
        <div className="px-5 py-5">
          <p className="text-lg font-semibold tracking-tight">Ruyou</p>
          <p className="mt-0.5 text-xs text-muted">Агрегатор чатов</p>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <NavLinks />
        </div>
        <div className="border-t border-border p-4">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
          <button
            onClick={handleLogout}
            className="mt-3 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </button>
        </div>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-black/20" onClick={() => setOpen(false)} aria-label="Закрыть меню" />
          <aside className="relative z-50 flex h-full w-72 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between px-4 py-4">
              <p className="font-semibold">Ruyou</p>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Закрыть">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <div className="border-t border-border p-4">
              <p className="text-sm font-medium">{user.name}</p>
              <button onClick={handleLogout} className="mt-3 text-sm text-muted">
                Выйти
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-white/90 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Меню">
            <Menu className="h-5 w-5" />
          </button>
          <p className="font-semibold">Ruyou</p>
        </header>
        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
}
