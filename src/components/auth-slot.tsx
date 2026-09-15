import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function AuthSlot({ signInTo = "/login" }: { signInTo?: string }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="h-11 w-11 animate-pulse rounded-full bg-elevated" />;
  }
  if (user) return <UserButton />;
  return (
    <Link
      to={signInTo}
      className="inline-flex h-11 items-center rounded-[var(--radius-sm)] px-4 text-sm font-medium text-fg hover:bg-elevated"
    >
      Staff sign in
    </Link>
  );
}
