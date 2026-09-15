import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getStaffMe } from "@/lib/cuepay/server";
import { AppShell, AppSkeleton } from "@/components/app-shell";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RedirectToSignIn } from "@/lib/auth/gates";

export const Route = createFileRoute("/admin")({
  // Server-side loader: if not owner, redirect immediately
  beforeLoad: async () => {
    try {
      const me = await getStaffMe();
      if (me.role !== "owner") {
        throw redirect({ to: "/app" });
      }
    } catch (err: unknown) {
      // Not authenticated at all
      if (err && typeof err === "object" && "redirect" in err) throw err;
      throw redirect({ to: "/login" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <AppSkeleton />;
  if (!user) return <RedirectToSignIn />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
