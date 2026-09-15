import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { getDashboard } from "@/lib/cuepay/server";

export const Route = createFileRoute("/app/floor/")({ component: FloorPicker });

function FloorPicker() {
  const { data, isPending } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboard(),
  });
  if (isPending) {
    return <div className="h-40 animate-pulse rounded-[var(--radius-xl)] bg-surface" />;
  }
  const locs = data?.locations ?? [];
  if (locs.length === 1) {
    return <Navigate to="/app/floor/$locationId" params={{ locationId: locs[0].id }} />;
  }
  return (
    <div>
      <h1 className="font-display text-4xl tracking-tight">Pick a floor</h1>
      <p className="mt-2 text-sm text-muted">Open the live table grid for a venue.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {locs.map((v) => (
          <Link
            key={v.id}
            to="/app/floor/$locationId"
            params={{ locationId: v.id }}
            className="rounded-[var(--radius-xl)] bg-surface p-5 hairline hover:bg-elevated"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-muted">
              {v.city} · {v.area}
            </p>
            <h2 className="mt-1 font-display text-2xl tracking-tight">{v.name}</h2>
            <p className="mt-2 text-sm text-muted">
              {v.busy} busy · {v.idle} idle · {v.pendingGames} waiting
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
