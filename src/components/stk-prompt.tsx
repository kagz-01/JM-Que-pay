import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatKes } from "@/lib/cuepay/format";
import { X } from "lucide-react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export function StkPrompt({
  amountKes,
  till,
  locationName,
  phoneMasked,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  amountKes: number;
  till: string;
  locationName: string;
  phoneMasked: string;
  busy?: boolean;
  error?: string | null;
  onSubmit: (pin: string) => void;
  onCancel: () => void;
}) {
  const [pin, setPin] = useState("");

  function press(key: string) {
    if (key === "⌫") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (!key) return;
    setPin((p) => (p.length < 4 ? p + key : p));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg/70 p-3 sm:items-center">
      <div
        role="dialog"
        aria-labelledby="stk-title"
        className="w-full max-w-sm overflow-hidden rounded-[var(--radius-2xl)] bg-surface shadow-[var(--shadow-soft)] hairline"
      >
        <div className="flex items-center justify-between bg-felt-deep px-4 py-3">
          <p id="stk-title" className="text-xs font-medium uppercase tracking-[0.18em] text-fg/80">
            STK Push
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="grid size-9 place-items-center rounded-full text-fg/70 hover:bg-white/5"
            aria-label="Cancel payment"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <p className="text-sm text-muted">Buy Goods · Till {till}</p>
            <p className="font-display text-3xl tracking-tight">{formatKes(amountKes)}</p>
            <p className="mt-1 text-sm text-muted">
              {locationName} · {phoneMasked}
            </p>
          </div>
          <p className="text-sm text-fg">Enter your M-Pesa PIN to confirm.</p>
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="grid size-11 place-items-center rounded-full border border-border bg-elevated"
              >
                {pin[i] ? (
                  <span className="size-2.5 rounded-full bg-fg" />
                ) : (
                  <span className="size-1.5 rounded-full bg-subtle" />
                )}
              </span>
            ))}
          </div>
          {error ? <p className="text-center text-sm text-danger">{error}</p> : null}
          <div className="grid grid-cols-3 gap-2">
            {KEYS.map((k, i) =>
              k === "" ? (
                <span key={i} />
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={() => press(k)}
                  className="h-12 rounded-[var(--radius-md)] bg-elevated text-lg font-medium hover:bg-border"
                >
                  {k}
                </button>
              ),
            )}
          </div>
          <Button
            className="w-full"
            size="lg"
            disabled={pin.length !== 4 || busy}
            onClick={() => onSubmit(pin)}
          >
            {busy ? "Confirming…" : "Send"}
          </Button>
          <p className="text-center text-[11px] text-subtle">
            Demo PIN: any 4 digits. 0000 cancels.
          </p>
        </div>
      </div>
    </div>
  );
}
