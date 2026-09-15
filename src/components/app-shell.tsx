import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  LayoutGrid,
  Settings,
  Table2,
  Wallet,
  BarChart3,
} from "lucide-react";
import { Wordmark } from "@/components/logo";
import { UserButton } from "@/lib/auth/gates";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const NAV = [
  { to: "/app", label: "Overview", icon: LayoutGrid, exact: true },
  { to: "/app/floor", label: "Floor", icon: Table2, exact: false },
  { to: "/app/transactions", label: "Payments", icon: Wallet, exact: false },
  { to: "/app/reports", label: "Reports", icon: BarChart3, exact: false },
  { to: "/app/alerts", label: "Alerts", icon: Bell, exact: false },
  { to: "/app/settings", label: "Settings", icon: Settings, exact: false },
];

function NavLinks() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <>
      {NAV.map((item) => {
        const active = item.exact
          ? pathname === item.to
          : pathname === item.to || pathname.startsWith(item.to + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-colors duration-150",
              active ? "bg-elevated text-fg" : "text-muted hover:bg-elevated/60 hover:text-fg",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col border-r border-border bg-surface px-3 py-5 md:flex">
        <Link to="/" className="mb-8 px-2">
          <Wordmark />
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          <NavLinks />
        </nav>
        <div className="mt-auto border-t border-border px-1 pt-4">
          <UserButton />
        </div>
      </aside>
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border bg-bg/90 px-4 py-3 backdrop-blur md:hidden">
        <Link to="/">
          <Wordmark />
        </Link>
        <div className="flex min-w-0 items-center gap-1">
          <Link
            to="/app/settings"
            aria-label="Settings"
            className="grid size-11 place-items-center rounded-[var(--radius-sm)] text-muted hover:text-fg"
          >
            <Settings className="size-5" />
          </Link>
          <UserButton />
        </div>
      </header>
      <main className="pb-24 md:ml-56 md:pb-8">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">{children}</div>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-surface/95 px-1 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        {NAV.filter((n) => n.to !== "/app/settings").map((item) => (
          <MobileNavItem key={item.to} {...item} />
        ))}
      </nav>
    </div>
  );
}

function MobileNavItem({
  to,
  label,
  icon: Icon,
  exact,
}: (typeof NAV)[number]) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
  return (
    <Link
      to={to}
      className={cn(
        "flex min-h-11 flex-col items-center justify-center gap-1 rounded-[var(--radius-sm)] py-2 text-[10px] font-medium",
        active ? "text-accent" : "text-muted",
      )}
    >
      <Icon className="size-5" />
      {label}
    </Link>
  );
}

export function AppSkeleton() {
  return (
    <div className="min-h-dvh bg-bg">
      <div className="hidden md:block">
        <div className="fixed inset-y-0 left-0 w-56 border-r border-border bg-surface" />
      </div>
      <div className="h-14 border-b border-border md:hidden" />
      <div className="md:ml-56">
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
          <div className="h-8 w-48 animate-pulse rounded bg-elevated" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-[var(--radius-xl)] bg-surface" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-[var(--radius-xl)] bg-surface" />
        </div>
      </div>
    </div>
  );
}
