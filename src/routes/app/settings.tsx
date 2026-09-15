import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { TableStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSettings, setGameMinutes, setTablePrice, setTableStatus } from "@/lib/cuepay/server";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

function SettingsPage() {
  const qc = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["settings"],
    queryFn: () => getSettings(),
  });
  const savePrice = useMutation({
    mutationFn: (input: { tableId: string; priceKes: number }) => setTablePrice({ data: input }),
    onSuccess: () => {
      toast.success("Price updated");
      void qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const saveMins = useMutation({
    mutationFn: (input: { locationId: string; minutes: number }) => setGameMinutes({ data: input }),
    onSuccess: () => {
      toast.success("Game length updated");
      void qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const saveStatus = useMutation({
    mutationFn: (input: { tableId: string; status: "idle" | "maintenance" | "offline" }) =>
      setTableStatus({ data: input }),
    onSuccess: () => {
      toast.success("Table status updated");
      void qc.invalidateQueries({ queryKey: ["settings"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  if (isPending || !data) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-xl)] bg-surface" />;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Till {data.me.tillNumber} · {data.me.orgName}. Prices and game length apply on the next payment.
        </p>
      </header>

      {data.locations.map((loc) => (
        <section key={loc.id} className="rounded-[var(--radius-xl)] bg-surface p-5 hairline">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl tracking-tight">{loc.name}</h2>
              <p className="text-sm text-muted">
                {loc.address} · {loc.hours}
              </p>
            </div>
            <label className="text-sm text-muted">
              Game length
              <span className="ml-2 inline-flex items-center gap-2">
                <Input
                  type="number"
                  min={5}
                  max={90}
                  defaultValue={loc.gameMinutes}
                  className="h-11 w-20"
                  onBlur={(e) => {
                    const minutes = Number(e.target.value);
                    if (minutes && minutes !== loc.gameMinutes) {
                      saveMins.mutate({ locationId: loc.id, minutes });
                    }
                  }}
                />
                <span className="text-xs">min</span>
              </span>
            </label>
          </div>
          <ul className="mt-5 divide-y divide-border">
            {data.tables
              .filter((t) => t.locationId === loc.id)
              .map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-[7rem] flex-1">
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="font-mono text-xs text-muted">{t.code}</p>
                  </div>
                  <TableStatusBadge status={t.status} />
                  <label className="flex items-center gap-2 text-sm text-muted">
                    KES
                    <Input
                      type="number"
                      min={10}
                      max={2000}
                      defaultValue={t.priceKes}
                      className="h-11 w-24"
                      onBlur={(e) => {
                        const priceKes = Number(e.target.value);
                        if (priceKes && priceKes !== t.priceKes) {
                          savePrice.mutate({ tableId: t.id, priceKes });
                        }
                      }}
                    />
                  </label>
                  <div className="flex gap-2">
                    {t.status === "maintenance" ? (
                      <Button size="sm" variant="secondary" onClick={() => saveStatus.mutate({ tableId: t.id, status: "idle" })}>
                        Unlock
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveStatus.mutate({ tableId: t.id, status: "maintenance" })}
                      >
                        Lock
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/t/$code" params={{ code: t.code }}>
                        Pay link
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
