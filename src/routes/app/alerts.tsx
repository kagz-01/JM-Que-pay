import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatWhen } from "@/lib/cuepay/format";
import { getAlertsPage, resolveAlert } from "@/lib/cuepay/server";

export const Route = createFileRoute("/app/alerts")({ component: AlertsPage });

function AlertsPage() {
  const qc = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => getAlertsPage(),
    refetchInterval: 8000,
  });
  const resolve = useMutation({
    mutationFn: (id: string) => resolveAlert({ data: { id } }),
    onSuccess: () => {
      toast.success("Alert cleared");
      void qc.invalidateQueries({ queryKey: ["alerts"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const open = (data?.alerts ?? []).filter((a) => !a.resolved);
  const done = (data?.alerts ?? []).filter((a) => a.resolved);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl tracking-tight">Alerts</h1>
        <p className="mt-1 text-sm text-muted">
          Battery, hub dropouts, maintenance locks, and the staff action log.
        </p>
      </header>
      {isPending ? (
        <div className="h-40 animate-pulse rounded-[var(--radius-xl)] bg-surface" />
      ) : (
        <>
          <section className="space-y-3">
            {open.length === 0 ? (
              <p className="rounded-[var(--radius-xl)] bg-surface p-5 text-sm text-muted hairline">
                No open alerts.
              </p>
            ) : (
              open.map((a) => (
                <article key={a.id} className="rounded-[var(--radius-xl)] bg-surface p-4 hairline">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Badge tone={a.severity}>{a.severity}</Badge>
                      <p className="mt-2 text-sm leading-relaxed">{a.message}</p>
                      <p className="mt-1 text-xs text-subtle">{formatWhen(a.createdAt)}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => resolve.mutate(a.id)}
                      disabled={resolve.isPending}
                    >
                      Resolve
                    </Button>
                  </div>
                </article>
              ))
            )}
          </section>
          {done.length > 0 ? (
            <section>
              <h2 className="mb-3 font-display text-2xl tracking-tight">Cleared</h2>
              <ul className="space-y-2 text-sm text-muted">
                {done.map((a) => (
                  <li key={a.id} className="rounded-[var(--radius-lg)] bg-surface px-4 py-3 hairline">
                    {a.message}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section>
            <h2 className="mb-3 font-display text-2xl tracking-tight">Staff actions</h2>
            <ul className="divide-y divide-border rounded-[var(--radius-xl)] bg-surface hairline">
              {(data?.audit ?? []).length === 0 ? (
                <li className="px-4 py-5 text-sm text-muted">No overrides yet.</li>
              ) : (
                (data?.audit ?? []).map((r) => (
                  <li key={r.id} className="px-4 py-3">
                    <p className="text-sm">{r.detail}</p>
                    <p className="text-xs text-subtle">
                      {r.action} · {formatWhen(r.createdAt)}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
