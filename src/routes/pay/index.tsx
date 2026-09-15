import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Wordmark } from "@/components/logo";
import { formatKes } from "@/lib/cuepay/format";
import { listPublicLocations } from "@/lib/cuepay/server";

export const Route = createFileRoute("/pay/")({ component: PayIndex });

function PayIndex() {
  const { data, isPending } = useQuery({
    queryKey: ["public-locations"],
    queryFn: () => listPublicLocations(),
  });

  return (
    <div className="felt-wash min-h-dvh">
      <header className="mx-auto flex max-w-lg items-center justify-between px-4 py-5">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg">
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <Wordmark />
        <span className="w-12" />
      </header>
      <main className="mx-auto max-w-lg px-4 pb-16">
        <h1 className="font-display text-4xl tracking-tight">Choose a venue</h1>
        <p className="mt-2 text-sm text-muted">Then pick the table whose QR you scanned — or tap it here.</p>
        <div className="mt-6 space-y-3">
          {isPending
            ? [0, 1, 2].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-[var(--radius-xl)] bg-surface" />
              ))
            : (data ?? []).map((v) => (
                <Link
                  key={v.id}
                  to="/pay/$slug"
                  params={{ slug: v.slug }}
                  className="flex items-center justify-between rounded-[var(--radius-xl)] bg-surface p-5 hairline"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">
                      {v.city} · {v.area}
                    </p>
                    <h2 className="mt-1 font-display text-2xl tracking-tight">{v.name}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {v.tableCount} tables · from {formatKes(v.city === "Mombasa" ? 80 : v.city === "Kisumu" ? 40 : 50)}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-subtle" />
                </Link>
              ))}
        </div>
      </main>
    </div>
  );
}
