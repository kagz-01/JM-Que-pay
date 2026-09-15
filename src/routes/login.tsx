import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient, authEnabled } from "@/lib/auth/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getStaffMe } from "@/lib/cuepay/server";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
      });

      if (error) {
        toast.error(error.message || "Login failed");
        return;
      }

      // Fetch the staff profile to determine role-based redirect
      const profile = await getStaffMe();
      if (!profile) {
        toast.error("Staff profile not found");
        return;
      }

      if (profile.role === "owner") {
        navigate({ to: "/admin" });
      } else if (profile.role === "manager" && profile.locationId) {
        navigate({ to: "/app/floor/$locationId", params: { locationId: profile.locationId } });
      } else {
        navigate({ to: "/app" });
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center p-6 bg-neutral-50 dark:bg-neutral-950">
      <div className="w-full max-w-sm space-y-6 p-8 bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800">
        <h1 className="text-2xl font-bold text-center">Staff Login</h1>
        
        {authEnabled ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
                placeholder="manager@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full"
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-neutral-500 text-center">Sign-in is disabled.</p>
        )}
      </div>
    </main>
  );
}
