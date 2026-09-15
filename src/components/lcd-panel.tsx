import { lcdFor } from "@/lib/cuepay/lcd";
import type { PoolTable } from "@/lib/cuepay/types";
import { cn } from "@/lib/utils";

export function LcdPanel({ table, className }: { table: PoolTable; className?: string }) {
  const lcd = lcdFor(table);
  return (
    <div
      className={cn(
        "rounded-[var(--radius-sm)] bg-[#0a1a12] px-3 py-2 font-mono text-[11px] leading-tight tracking-[0.14em] text-accent",
        "shadow-inner",
        className,
      )}
    >
      <div className="whitespace-pre">{lcd.line1}</div>
      <div className="whitespace-pre opacity-90">{lcd.line2}</div>
    </div>
  );
}
