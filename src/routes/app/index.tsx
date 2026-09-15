import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bell } from "lucide-react";
import { SessionStatusBadge } from "@/components/status-badge";
import { formatKes, formatWhen } from "@/lib/cuepay/format";
import { getDashboard } from "@/lib/cuepay/server";

export const Route = createFileRoute("/app/")({ component: Overview });

function Overview() {
  const { data, isPending, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboard(),
    refetchInterval: 5000,
  });

  if (isPending) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-56 animate-pulse rounded bg-elevated" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-[var(--radius-xl)] bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-sm text-danger">Could not load the console. Sign in again if this persists.</p>;
  }

  const { me, kpis, locations, recent, alerts } = data;

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">
          {me.role === "owner" ? "Owner" : "Manager"} · Till {me.tillNumber}
        </p>
        <h1 className="mt-1 font-display text-4xl tracking-tight">Tonight on the floor</h1>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Today" value={formatKes(kpis.todayKes)} hint={`${kpis.gamesToday} games`} />
        <Kpi label="Last 7 days" value={formatKes(kpis.weekKes)} hint={`${kpis.weekGames} games`} />
        <Kpi
          label="Occupancy"
          value={`${kpis.busy}/${kpis.tableCount}`}
          hint={`${kpis.idle} idle · ${kpis.pendingGames} waiting`}
        />
        <Kpi label="Open alerts" value={String(kpis.openAlerts)} hint="Battery, hub, locks" />
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-2xl tracking-tight">Venues</h2>
          <Link to="/app/floor" className="text-sm text-accent hover:underline">
            Open a floor
          </Link>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {locations.map((v) => (
            <Link
              key={v.id}
              to="/app/floor/$locationId"
              params={{ locationId: v.id }}
              className="rounded-[var(--radius-xl)] bg-surface p-5 hairline transition-colors hover:bg-elevated"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">
                    {v.city} · {v.area}
                  </p>
                  <h3 className="mt-1 font-display text-2xl tracking-tight">{v.name}</h3>
                </div>
                <ArrowRight className="size-4 text-subtle" />
              </div>
              <dl className="mt-4 grid grid-cols-4 gap-2 text-sm">
                <Stat k="Busy" v={v.busy} warn={v.busy > 0} />
                <Stat k="Idle" v={v.idle} />
                <Stat k="Wait" v={v.pendingGames} />
                <div>
                  <dt className="text-[11px] text-subtle">Today</dt>
                  <dd className="tabular-nums">{formatKes(v.todayKes)}</dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="font-display text-2xl tracking-tight">Latest payments</h2>
            <Link to="/app/transactions" className="text-sm text-accent hover:underline">
              All
            </Link>
          </div>
          <ul className="divide-y divide-border rounded-[var(--radius-xl)] bg-surface hairline">
            {recent.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {s.locationName} · {s.tableName}
                  </p>
                  <p className="text-xs text-muted">
                    {s.phoneMasked} · {formatWhen(s.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="tabular-nums text-sm">{formatKes(s.amountKes)}</p>
                  <SessionStatusBadge status={s.status} />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="font-display text-2xl tracking-tight">Alerts</h2>
            <Link to="/app/alerts" className="text-sm text-accent hover:underline">
              All
            </Link>
          </div>
          <ul className="space-y-2">
            {alerts.length === 0 ? (
              <li className="rounded-[var(--radius-xl)] bg-surface p-5 text-sm text-muted hairline">
                Nothing needs you right now.
              </li>
            ) : (
              alerts.map((a) => (
                <li key={a.id} className="rounded-[var(--radius-xl)] bg-surface p-4 hairline">
                  <div className="flex items-start gap-2">
                    <Bell className="mt-0.5 size-4 text-warn" />
                    <p className="text-sm leading-relaxed">{a.message}</p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-[var(--radius-xl)] bg-surface p-4 hairline">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-subtle">{hint}</p>
    </div>
  );
}

function Stat({ k, v, warn }: { k: string; v: number; warn?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] text-subtle">{k}</dt>
      <dd className={`tabular-nums ${warn ? "text-danger" : ""}`}>{v}</dd>
    </div>
  );
}
