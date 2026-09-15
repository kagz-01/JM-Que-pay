import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatKes } from "@/lib/cuepay/format";
import { getReports } from "@/lib/cuepay/server";

export const Route = createFileRoute("/app/reports")({ component: Reports });

function Reports() {
  const { data, isPending } = useQuery({
    queryKey: ["reports"],
    queryFn: () => getReports(),
  });

  if (isPending || !data) {
    return <div className="h-72 animate-pulse rounded-[var(--radius-xl)] bg-surface" />;
  }

  const weekKes = data.days.reduce((s, d) => s + d.kes, 0);
  const weekGames = data.days.reduce((s, d) => s + d.games, 0);
  const chart = data.days.map((d) => ({
    ...d,
    label: d.day.slice(5),
  }));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted">Seven-day take, by venue and by table.</p>
      </header>
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[var(--radius-xl)] bg-surface p-5 hairline">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">7-day revenue</p>
          <p className="mt-2 font-display text-4xl tracking-tight tabular-nums">{formatKes(weekKes)}</p>
        </div>
        <div className="rounded-[var(--radius-xl)] bg-surface p-5 hairline">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Games released</p>
          <p className="mt-2 font-display text-4xl tracking-tight tabular-nums">{weekGames}</p>
        </div>
      </section>
      <section className="rounded-[var(--radius-xl)] bg-surface p-5 hairline">
        <h2 className="font-display text-2xl tracking-tight">Daily take</h2>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="label" stroke="var(--color-subtle)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                stroke="var(--color-subtle)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                width={36}
              />
              <Tooltip
                cursor={{ fill: "var(--color-elevated)" }}
                contentStyle={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  color: "var(--color-fg)",
                }}
                formatter={(value: number | string) => [formatKes(Number(value)), "Revenue"]}
              />
              <Bar dataKey="kes" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-display text-2xl tracking-tight">By venue</h2>
          <ul className="divide-y divide-border rounded-[var(--radius-xl)] bg-surface hairline">
            {data.byLocation.map((r) => (
              <li key={r.name} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted">{r.city} · {r.games} games</p>
                </div>
                <p className="tabular-nums text-sm">{formatKes(r.kes)}</p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 font-display text-2xl tracking-tight">By table</h2>
          <ul className="divide-y divide-border rounded-[var(--radius-xl)] bg-surface hairline">
            {data.byTable.slice(0, 8).map((r) => (
              <li key={r.code} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {r.locationName} · {r.name}
                  </p>
                  <p className="font-mono text-xs text-muted">{r.code}</p>
                </div>
                <p className="tabular-nums text-sm">{formatKes(r.kes)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
