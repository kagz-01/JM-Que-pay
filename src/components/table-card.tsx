import { useEffect, useState } from "react";
import { Battery, Radio, Timer } from "lucide-react";
import { FeltMini } from "@/components/felt-mini";
import { LcdPanel } from "@/components/lcd-panel";
import { TableStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { elapsed, formatKes } from "@/lib/cuepay/format";
import type { PoolTable } from "@/lib/cuepay/types";
import { cn } from "@/lib/utils";

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function TableCard({
  table,
  onRelease,
  onLock,
  onUnlock,
  busyAction,
}: {
  table: PoolTable;
  onRelease?: () => void;
  onLock?: () => void;
  onUnlock?: () => void;
  busyAction?: boolean;
}) {
  useNow(1000);
  const lowBatt = table.batteryPct <= 20;
  return (
    <article className="flex flex-col rounded-[var(--radius-xl)] bg-surface p-4 hairline">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-medium">{table.name}</h3>
          <p className="font-mono text-xs text-muted">{table.code}</p>
        </div>
        <TableStatusBadge status={table.status} />
      </div>
      <FeltMini status={table.status} className="mb-3 h-24" />
      <LcdPanel table={table} className="mb-3" />
      <dl className="mb-3 grid grid-cols-2 gap-2 text-xs text-muted">
        <div className="flex items-center gap-1.5">
          <Timer className="size-3.5" />
          <span className="tabular-nums">
            {table.status === "busy" ? elapsed(table.busySince) : `${table.gameMinutes} min game`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="tabular-nums">{formatKes(table.priceKes)}</span>
        </div>
        <div className={cn("flex items-center gap-1.5", lowBatt && "text-warn")}>
          <Battery className="size-3.5" />
          <span className="tabular-nums">{table.batteryPct}%</span>
        </div>
        <div className={cn("flex items-center gap-1.5", !table.hubOnline && "text-danger")}>
          <Radio className="size-3.5" />
          <span>{table.hubOnline ? "Hub live" : "Hub down"}</span>
        </div>
      </dl>
      {table.pendingGames > 0 ? (
        <p className="mb-3 text-xs text-accent">
          {table.pendingGames} paid game{table.pendingGames === 1 ? "" : "s"} waiting
        </p>
      ) : null}
      <div className="mt-auto flex gap-2">
        {table.status === "maintenance" ? (
          <Button variant="secondary" className="flex-1" size="sm" onClick={onUnlock} disabled={busyAction}>
            Unlock
          </Button>
        ) : (
          <>
            <Button
              className="flex-1"
              size="sm"
              onClick={onRelease}
              disabled={busyAction || table.status === "offline"}
            >
              {table.pendingGames > 0 ? "Release" : "Force open"}
            </Button>
            <Button variant="outline" size="sm" onClick={onLock} disabled={busyAction}>
              Lock
            </Button>
          </>
        )}
      </div>
    </article>
  );
}
