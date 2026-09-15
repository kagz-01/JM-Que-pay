import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  Users,
  TrendingUp,
  TableIcon,
  ChevronRight,
  Shield,
  Banknote,
} from "lucide-react";
import { getAdminOverview } from "@/lib/cuepay/server";
import { formatKes } from "@/lib/cuepay/format";
import type { StaffRole } from "@/lib/cuepay/types";
import { AddManagerDialog } from "@/components/add-manager-dialog";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

function AdminDashboard() {
  const { data, isPending, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => getAdminOverview(),
    refetchInterval: 10_000,
  });

  if (isPending) return <AdminSkeleton />;

  if (error || !data) {
    return (
      <p className="text-sm text-danger">
        Could not load admin overview. Make sure you have owner access.
      </p>
    );
  }

  const { me, locations, staff, todayKes, todayGames } = data;
  const owners = staff.filter((s) => s.role === "owner");
  const managers = staff.filter((s) => s.role === "manager");
  const totalTables = locations.reduce((s, l) => s + l.tableCount, 0);
  const totalBusy = locations.reduce((s, l) => s + l.busy, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted flex items-center gap-1.5">
            <Shield className="size-3" /> Owner · {me.orgName}
          </p>
          <h1 className="mt-1 font-display text-4xl tracking-tight">
            Admin Control Centre
          </h1>
        </div>
        <Link
          to="/app"
          className="text-sm text-accent hover:underline flex items-center gap-1"
        >
          Switch to Floor View <ChevronRight className="size-3.5" />
        </Link>
      </header>

      {/* Top KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={<Banknote className="size-4 text-accent" />}
          label="Today's Revenue"
          value={formatKes(todayKes)}
          hint="All locations"
        />
        <Kpi
          icon={<TableIcon className="size-4 text-accent" />}
          label="Games Today"
          value={String(todayGames)}
          hint={`${totalBusy} tables busy now`}
        />
        <Kpi
          icon={<Building2 className="size-4 text-accent" />}
          label="Locations"
          value={String(locations.length)}
          hint={`${totalTables} tables total`}
        />
        <Kpi
          icon={<Users className="size-4 text-accent" />}
          label="Staff"
          value={String(staff.length)}
          hint={`${owners.length} owners · ${managers.length} managers`}
        />
      </section>

      {/* Locations grid */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-2xl tracking-tight">Locations</h2>
          <TrendingUp className="size-4 text-subtle" />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {locations.map((loc) => (
            <Link
              key={loc.id}
              to="/app/floor/$locationId"
              params={{ locationId: loc.id }}
              className="rounded-(--radius-xl) bg-surface p-5 hairline transition-colors hover:bg-elevated group"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">
                    {loc.city} · {loc.area}
                  </p>
                  <h3 className="mt-1 font-display text-2xl tracking-tight group-hover:text-accent transition-colors">
                    {loc.name}
                  </h3>
                </div>
                <ChevronRight className="size-4 text-subtle group-hover:text-accent transition-colors" />
              </div>
              <dl className="mt-4 grid grid-cols-4 gap-2 text-sm">
                <Stat k="Busy" v={loc.busy} warn={loc.busy > 0} />
                <Stat k="Idle" v={loc.idle} />
                <Stat k="Tables" v={loc.tableCount} />
                <div>
                  <dt className="text-[11px] text-subtle">Today</dt>
                  <dd className="tabular-nums">{formatKes(loc.todayKes)}</dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      </section>

      {/* Staff list */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-2xl tracking-tight">Staff</h2>
          <AddManagerDialog locations={locations} />
        </div>
        <div className="rounded-(--radius-xl) bg-surface hairline divide-y divide-border">
          {staff.length === 0 ? (
            <p className="p-5 text-sm text-muted">No staff accounts yet.</p>
          ) : (
            staff.map((s) => <StaffRow key={s.id} {...s} />)
          )}
        </div>
      </section>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function Kpi({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-(--radius-xl) bg-surface p-4 hairline space-y-2">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted">
        {icon}
        {label}
      </div>
      <p className="font-display text-3xl tracking-tight tabular-nums">{value}</p>
      <p className="text-xs text-subtle">{hint}</p>
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

function StaffRow({
  role,
  email,
  locationName,
}: {
  role: StaffRole | string;
  email: string | null;
  locationName: string | null;
}) {
  const badge =
    role === "owner"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
      : "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300";

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{email ?? "—"}</p>
        {locationName && (
          <p className="text-xs text-muted">{locationName}</p>
        )}
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${badge}`}
      >
        {role}
      </span>
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-64 animate-pulse rounded bg-elevated" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-(--radius-xl) bg-surface" />
        ))}
      </div>
    </div>
  );
}
