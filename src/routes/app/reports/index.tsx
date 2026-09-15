import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { formatKes } from "@/lib/cuepay/format";
import { getReports } from "@/lib/cuepay/server";

export const Route = createFileRoute("/app/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { data, isPending } = useQuery({
    queryKey: ["app", "reports"],
    queryFn: () => getReports(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted">7-day revenue performance across your tables.</p>
      </div>

      {isPending ? (
        <div className="space-y-4">
          <div className="h-64 animate-pulse rounded-[var(--radius-xl)] bg-surface" />
          <div className="h-48 animate-pulse rounded-[var(--radius-xl)] bg-surface" />
        </div>
      ) : !data ? (
        <p>No data</p>
      ) : (
        <div className="space-y-6">
          {/* Daily Trend */}
          <section className="rounded-[var(--radius-xl)] border border-border bg-surface p-5">
            <h2 className="mb-4 text-sm font-medium text-muted">Daily Revenue (Last 7 Days)</h2>
            <div className="flex h-48 items-end gap-2">
              {data.days.map((d, i) => {
                const maxKes = Math.max(...data.days.map((x) => x.kes), 1);
                const height = `${(d.kes / maxKes) * 100}%`;
                return (
                  <div key={i} className="group relative flex flex-1 flex-col items-center justify-end gap-2">
                    <div
                      className="w-full min-w-[8px] rounded-t-sm bg-accent/20 transition-colors group-hover:bg-accent"
                      style={{ height: d.kes > 0 ? height : "4px" }}
                    />
                    <span className="text-[10px] text-muted">{d.day.slice(5)}</span>
                    {/* Tooltip */}
                    <div className="pointer-events-none absolute bottom-full mb-2 hidden whitespace-nowrap rounded bg-elevated px-2 py-1 text-xs shadow-lg group-hover:block">
                      {formatKes(d.kes)} ({d.games} games)
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Table Performance */}
          <section className="rounded-[var(--radius-xl)] border border-border bg-surface">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-medium text-muted">Table Performance (Last 7 Days)</h2>
            </div>
            <div className="divide-y divide-border">
              {data.byTable.map((t, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-muted">
                      {t.locationName} · {t.code}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatKes(t.kes)}</p>
                    <p className="text-xs text-muted">{t.games} games</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
