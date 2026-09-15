import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createManager } from "@/lib/cuepay/server";
import type { LocationCard } from "@/lib/cuepay/types";

export function AddManagerDialog({ locations }: { locations: LocationCard[] }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [locationId, setLocationId] = useState("");
  const qc = useQueryClient();

  const m = useMutation({
    mutationFn: createManager,
    onSuccess: (res) => {
      if (res && "ok" in res && res.ok === false) {
        toast.error(res.error);
        return;
      }
      toast.success("Manager created!");
      // We could display the temp password, but we know what it is.
      if (res && "tempPassword" in res) {
        toast("Temporary password: " + res.tempPassword, { duration: 10000 });
      }
      setOpen(false);
      setEmail("");
      setLocationId("");
      void qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        Add Manager
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[var(--radius-xl)] bg-surface p-6 shadow-xl border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display tracking-tight">Add Manager</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1 hover:bg-elevated transition-colors text-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!locationId) return toast.error("Select a location");
                m.mutate({ data: { email, locationId } });
              }}
              className="space-y-4"
            >
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted">Email Address</label>
                <Input
                  type="email"
                  required
                  placeholder="manager@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted">Location Assignment</label>
                <select
                  className="w-full rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  required
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                >
                  <option value="" disabled>Select a location...</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded border border-accent/20 bg-accent/5 p-3 text-sm text-accent">
                <p>The manager will log in with the temporary password:</p>
                <p className="mt-1 font-mono font-bold tracking-wider">CuePayManager123!</p>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={m.isPending}>
                  {m.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Create Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
