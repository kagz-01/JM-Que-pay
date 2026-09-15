import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { formatKes, formatWhen } from "@/lib/cuepay/format";
import { getTransactions } from "@/lib/cuepay/server";

export const Route = createFileRoute("/app/transactions")({
  component: TransactionsPage,
});

function TransactionsPage() {
  const [q, setQ] = useState("");
  const { data, isPending } = useQuery({
    queryKey: ["app", "transactions", q],
    queryFn: () => getTransactions({ data: { q } }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Payments Ledger</h1>
        <p className="mt-1 text-sm text-muted">All M-Pesa transactions for your locations.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input
          placeholder="Search phone or receipt..."
          className="pl-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {isPending ? (
        <div className="h-64 animate-pulse rounded-[var(--radius-xl)] bg-surface" />
      ) : !data || data.sessions.length === 0 ? (
        <div className="rounded-[var(--radius-xl)] border border-border border-dashed p-12 text-center">
          <p className="text-muted">No transactions found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-xl)] border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-elevated/50 text-muted">
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Table</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Ref</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.sessions.map((s) => (
                <tr key={s.id} className="hover:bg-elevated/30 transition-colors">
                  <td className="whitespace-nowrap px-4 py-3">{formatWhen(s.paidAt ?? s.createdAt)}</td>
                  <td className="px-4 py-3 text-muted">{s.locationName}</td>
                  <td className="px-4 py-3">{s.tableName}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono">{s.phoneMasked}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-muted">{s.mpesaRef ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium">{formatKes(s.amountKes)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.status === "released" || s.status === "paid"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : s.status === "pending"
                            ? "bg-blue-500/10 text-blue-500"
                            : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
