import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { TableCard } from "@/components/table-card";
import { forceRelease, getFloor, setTableStatus } from "@/lib/cuepay/server";
import { formatKes } from "@/lib/cuepay/format";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

export const Route = createFileRoute("/app/floor/$locationId")({ component: Floor });

function Floor() {
  const { locationId } = Route.useParams();
  const qc = useQueryClient();
  const { data, isPending, error } = useQuery({
    queryKey: ["floor", locationId],
    queryFn: () => getFloor({ data: { locationId } }),
  });

  useEffect(() => {
    const source = new EventSource("/api/live");
    source.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "ping") return;
        if (event.type === "table:update" || event.type === "session:update") {
          // If the event is for this location, or we are on the dashboard, invalidate
          if (event.locationId === locationId) {
            void qc.invalidateQueries({ queryKey: ["floor", locationId] });
          }
          void qc.invalidateQueries({ queryKey: ["dashboard"] });
        }
      } catch {}
    };
    return () => source.close();
  }, [locationId, qc]);
  const mutate = useMutation({
    mutationFn: async (input: { kind: "release" | "lock" | "unlock"; tableId: string }) => {
      if (input.kind === "release") return forceRelease({ data: { tableId: input.tableId } });
      return setTableStatus({
        data: { tableId: input.tableId, status: input.kind === "lock" ? "maintenance" : "idle" },
      });
    },
    onSuccess: (res) => {
      if (res && "ok" in res && res.ok === false) {
        toast.error(res.error);
        return;
      }
      if (res && "comped" in res && res.comped) toast.success("Comped game — solenoid fired");
      else if (res && "comped" in res) toast.success("Paid game released");
      else toast.success("Table updated");
      void qc.invalidateQueries({ queryKey: ["floor", locationId] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isPending) {
    return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-72 animate-pulse rounded-(--radius-xl) bg-surface" />
      ))}
    </div>;
  }
  if (error || !data) {
    return <p className="text-sm text-danger">Could not load this floor.</p>;
  }

  const { location, locations, tables } = data;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted">
            {location.city} · {location.hours}
          </p>
          <h1 className="font-display text-4xl tracking-tight">{location.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {location.busy} busy · {location.idle} idle · {location.pendingGames} waiting ·{" "}
            {formatKes(location.todayKes)} today
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {locations.map((v) => (
            <Link
              key={v.id}
              to="/app/floor/$locationId"
              params={{ locationId: v.id }}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium",
                v.id === location.id ? "bg-accent text-accent-fg" : "bg-elevated text-muted",
              )}
            >
              {v.area}
            </Link>
          ))}
        </div>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tables.map((t) => (
          <TableCard
            key={t.id}
            table={t}
            busyAction={mutate.isPending}
            onRelease={() => mutate.mutate({ kind: "release", tableId: t.id })}
            onLock={() => mutate.mutate({ kind: "lock", tableId: t.id })}
            onUnlock={() => mutate.mutate({ kind: "unlock", tableId: t.id })}
          />
        ))}
      </div>
    </div>
  );
}
