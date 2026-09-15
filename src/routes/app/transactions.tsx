import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SessionStatusBadge } from "@/components/status-badge";
import { Input } from "@/components/ui/input";
import { formatKes, formatWhen } from "@/lib/cuepay/format";
import { getTransactions } from "@/lib/cuepay/server";

export const Route = createFileRoute("/app/transactions")({ component: Transactions });

function Transactions() {
  const [q, setQ] = useState("");
  const [locationId, setLocationId] = useState("");
  const { data, isPending } = useQuery({
    queryKey: ["transactions", q, locationId],
    queryFn: () =>
      getTransactions({
        data: { q: q || undefined, locationId: locationId || undefined },
      }),
  });

  const totals = useMemo(() => {
    const paid = (data?.sessions ?? []).filter((s) => s.status === "paid" || s.status === "released");
    return {
      kes: paid.reduce((s, x) => s + x.amountKes, 0),
      n: paid.length,
    };
  }, [data]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-4xl tracking-tight">Payments</h1>
        <p className="mt-1 text-sm text-muted">
          Every STK session, with M-Pesa reference and table routing.
        </p>
      </header>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Search table, phone, ref…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="sm:max-w-xs"
        />
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className="h-12 rounded-[var(--radius-md)] border border-border bg-elevated px-3 text-sm text-fg"
        >
          <option value="">All venues</option>
          {(data?.locations ?? []).map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      <p className="text-sm text-muted">
        Showing {totals.n} settled · {formatKes(totals.kes)}
      </p>
      <div className="overflow-hidden rounded-[var(--radius-xl)] bg-surface hairline">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Table</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Ref</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {isPending ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-muted">
                    Loading…
                  </td>
                </tr>
              ) : (
                (data?.sessions ?? []).map((s) => (
                  <tr key={s.id} className="border-b border-border/70 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{formatWhen(s.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.tableName}</div>
                      <div className="text-xs text-muted">{s.locationName}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{s.phoneMasked}</td>
                    <td className="px-4 py-3 font-mono text-xs">{s.mpesaRef ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatKes(s.amountKes)}</td>
                    <td className="px-4 py-3">
                      <SessionStatusBadge status={s.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
