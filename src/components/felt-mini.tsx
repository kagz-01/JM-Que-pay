import { cn } from "@/lib/utils";
import type { TableStatus } from "@/lib/cuepay/types";

export function FeltMini({ status, className }: { status: TableStatus; className?: string }) {
  const dim = status === "offline" || status === "maintenance";
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-md)] felt-panel",
        dim && "opacity-55 grayscale",
        className,
      )}
    >
      <div className="absolute inset-[10%] rounded-[4px] border border-white/10" />
      {[
        ["8%", "8%"],
        ["92%", "8%"],
        ["8%", "92%"],
        ["92%", "92%"],
        ["50%", "6%"],
        ["50%", "94%"],
      ].map(([x, y], i) => (
        <span
          key={i}
          className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bg/80"
          style={{ left: x, top: y }}
        />
      ))}
      {status === "busy" ? (
        <>
          <span className="absolute left-[38%] top-[42%] size-2.5 rounded-full bg-fg" />
          <span className="absolute left-[52%] top-[48%] size-2 rounded-full bg-[#c45c4a]" />
          <span className="absolute left-[46%] top-[58%] size-2 rounded-full bg-[#d4c4a8]" />
        </>
      ) : status === "idle" ? (
        <span className="absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg/90" />
      ) : null}
    </div>
  );
}
