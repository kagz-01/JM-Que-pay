import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FeltMini } from "@/components/felt-mini";
import { LcdPanel } from "@/components/lcd-panel";
import { Wordmark } from "@/components/logo";
import { StkPrompt } from "@/components/stk-prompt";
import { TableStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatKes, formatWhen } from "@/lib/cuepay/format";
import { confirmStk, getPublicTable, initiateStk, releasePaidGame } from "@/lib/cuepay/server";
import type { PlaySession } from "@/lib/cuepay/types";

export const Route = createFileRoute("/t/$code")({ component: TablePay });

function TablePay() {
  const { code } = Route.useParams();
  const qc = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["public-table", code],
    queryFn: () => getPublicTable({ data: { code } }),
    refetchInterval: 4000,
  });
  const [phone, setPhone] = useState("");
  const [stk, setStk] = useState<{
    checkoutId: string;
    sessionId: string;
    amountKes: number;
    locationName: string;
    phoneMasked: string;
  } | null>(null);
  const [stkError, setStkError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PlaySession | null>(null);
  const [released, setReleased] = useState<string | null>(null);

  const startPay = useMutation({
    mutationFn: () => initiateStk({ data: { code, phone } }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setStkError(null);
      setStk({
        checkoutId: res.checkoutId,
        sessionId: res.sessionId,
        amountKes: res.amountKes,
        locationName: res.locationName,
        phoneMasked: res.phoneMasked,
      });
    },
    onError: () => toast.error("Could not start payment"),
  });

  const pinPay = useMutation({
    mutationFn: (pin: string) => confirmStk({ data: { checkoutId: stk!.checkoutId, pin } }),
    onSuccess: (res) => {
      if (!res.ok) {
        setStkError(res.error);
        return;
      }
      setStk(null);
      setReceipt(res.session);
      void qc.invalidateQueries({ queryKey: ["public-table", code] });
      toast.success("Payment confirmed");
    },
  });

  const release = useMutation({
    mutationFn: () =>
      releasePaidGame({ data: { code, sessionId: receipt?.id } }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setReleased(res.message);
      void qc.invalidateQueries({ queryKey: ["public-table", code] });
    },
  });

  if (isPending) {
    return (
      <div className="felt-wash grid min-h-dvh place-items-center">
        <div className="h-48 w-72 animate-pulse rounded-[var(--radius-xl)] bg-surface" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="felt-wash grid min-h-dvh place-items-center px-4 text-center">
        <div>
          <p className="font-display text-3xl">Unknown table</p>
          <Link to="/pay" className="mt-4 inline-block text-accent">
            Choose a venue
          </Link>
        </div>
      </div>
    );
  }

  const { table, tillNumber } = data;

  return (
    <div className="felt-wash min-h-dvh">
      <header className="mx-auto flex max-w-md items-center justify-between px-4 py-5">
        <Link
          to="/pay/$slug"
          params={{ slug: table.locationSlug }}
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg"
        >
          <ArrowLeft className="size-4" />
          {table.locationName}
        </Link>
        <Wordmark />
      </header>
      <main className="mx-auto max-w-md px-4 pb-16">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl tracking-tight">{table.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {table.locationName} · {table.city}
            </p>
          </div>
          <TableStatusBadge status={table.status} />
        </div>
        <FeltMini status={table.status} className="mt-5 h-36" />
        <LcdPanel table={table} className="mt-3" />

        {released ? (
          <div className="mt-6 rounded-[var(--radius-xl)] bg-surface p-5 hairline">
            <div className="mb-3 grid size-10 place-items-center rounded-full bg-accent/15 text-accent">
              <Check className="size-5" />
            </div>
            <h2 className="font-display text-2xl tracking-tight">Balls are out</h2>
            <p className="mt-2 text-sm text-muted">{released}</p>
            <p className="mt-3 text-sm text-muted">Game length {table.gameMinutes} minutes.</p>
            <Button asChild className="mt-5 w-full" variant="secondary">
              <Link to="/pay/$slug" params={{ slug: table.locationSlug }}>
                Pay for another table
              </Link>
            </Button>
          </div>
        ) : receipt ? (
          <div className="mt-6 rounded-[var(--radius-xl)] bg-surface p-5 hairline">
            <p className="text-xs uppercase tracking-[0.18em] text-accent">Digital receipt</p>
            <h2 className="mt-2 font-display text-3xl tracking-tight">{formatKes(receipt.amountKes)}</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Table</dt>
                <dd>
                  {receipt.locationName} · {receipt.tableName}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">M-Pesa ref</dt>
                <dd className="font-mono">{receipt.mpesaRef}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Phone</dt>
                <dd className="font-mono">{receipt.phoneMasked}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Paid</dt>
                <dd>{formatWhen(receipt.paidAt)}</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-muted">
              SMS sent to {receipt.phoneMasked}. Press the table button — or release from here — to drop the balls.
            </p>
            <Button className="mt-5 w-full" size="lg" onClick={() => release.mutate()} disabled={release.isPending}>
              {release.isPending ? "Firing solenoid…" : "Press to open"}
            </Button>
          </div>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              startPay.mutate();
            }}
          >
            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm text-muted">
                M-Pesa number
              </label>
              <Input
                id="phone"
                inputMode="tel"
                autoComplete="tel"
                placeholder="07xx xxx xxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={startPay.isPending || table.status === "maintenance" || table.status === "offline"}
            >
              {startPay.isPending ? "Sending prompt…" : `Lipa ${formatKes(table.priceKes)}`}
            </Button>
            <p className="text-center text-xs text-subtle">
              Buy Goods till {tillNumber} · {table.gameMinutes} min game
            </p>
          </form>
        )}
      </main>
      {stk ? (
        <StkPrompt
          amountKes={stk.amountKes}
          till={tillNumber}
          locationName={stk.locationName}
          phoneMasked={stk.phoneMasked}
          busy={pinPay.isPending}
          error={stkError}
          onCancel={() => setStk(null)}
          onSubmit={(pin) => pinPay.mutate(pin)}
        />
      ) : null}
    </div>
  );
}
