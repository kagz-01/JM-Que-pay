import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { FeltMini } from "@/components/felt-mini";
import { Wordmark } from "@/components/logo";
import { TableStatusBadge } from "@/components/status-badge";
import { formatKes } from "@/lib/cuepay/format";
import { getPublicLocation } from "@/lib/cuepay/server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pay/$slug")({ component: PayVenue });

function PayVenue() {
  const { slug } = Route.useParams();
  const qc = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["public-location", slug],
    queryFn: () => getPublicLocation({ data: { slug } }),
  });

  useEffect(() => {
    const source = new EventSource("/api/live");
    source.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "ping") return;
        if (event.type === "table:update" || event.type === "session:update") {
          void qc.invalidateQueries({ queryKey: ["public-location", slug] });
        }
      } catch {}
    };
    return () => source.close();
  }, [slug, qc]);

  if (isPending) {
    return (
      <div className="felt-wash min-h-dvh px-4 py-8">
        <div className="mx-auto max-w-lg space-y-3">
          <div className="h-10 w-40 animate-pulse rounded bg-elevated" />
          <div className="h-48 animate-pulse rounded-[var(--radius-xl)] bg-surface" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="felt-wash grid min-h-dvh place-items-center px-4">
        <p className="text-muted">Venue not found.</p>
      </div>
    );
  }

  return (
    <div className="felt-wash min-h-dvh">
      <header className="mx-auto flex max-w-lg items-center justify-between px-4 py-5">
        <Link to="/pay" className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg">
          <ArrowLeft className="size-4" />
          Venues
        </Link>
        <Wordmark />
        <span className="w-14" />
      </header>
      <main className="mx-auto max-w-lg px-4 pb-16">
        <p className="text-xs uppercase tracking-[0.16em] text-muted">
          {data.city} · {data.area}
        </p>
        <h1 className="mt-1 font-display text-4xl tracking-tight">{data.name}</h1>
        <p className="mt-2 text-sm text-muted">
          {data.address} · {data.hours}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {data.tables.map((t) => {
            const blocked = t.status === "maintenance" || t.status === "offline";
            const inner = (
              <>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-medium">{t.name}</h2>
                    <p className="font-mono text-[11px] text-muted">{t.code}</p>
                  </div>
                  <TableStatusBadge status={t.status} />
                </div>
                <FeltMini status={t.status} className="h-16" />
                <p className="mt-2 text-sm tabular-nums">{formatKes(t.priceKes)}</p>
                {t.pendingGames > 0 ? (
                  <p className="text-[11px] text-accent">{t.pendingGames} waiting</p>
                ) : null}
              </>
            );
            if (blocked) {
              return (
                <div key={t.id} className="rounded-[var(--radius-lg)] bg-surface p-3 opacity-70 hairline">
                  {inner}
                </div>
              );
            }
            return (
              <Link
                key={t.id}
                to="/t/$code"
                params={{ code: t.code }}
                className={cn(
                  "rounded-[var(--radius-lg)] bg-surface p-3 hairline transition-colors hover:bg-elevated",
                )}
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
