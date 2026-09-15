import { createFileRoute } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="grid min-h-screen place-items-center p-6 bg-neutral-50 dark:bg-neutral-950">
      <div className="w-full max-w-sm space-y-3 p-8 bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800">
        <h1 className="text-2xl font-bold mb-6 text-center">Manager Login</h1>
        {authEnabled ? (
          GROK_PROVIDERS.map((p) => (
            <button
              key={p.providerId}
              type="button"
              onClick={() => signIn(p.providerId, { callbackURL: "/manager" })}
              className="w-full cursor-pointer rounded-md border border-neutral-300 px-4 py-3 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800 transition-colors font-medium"
            >
              Continue with {p.label}
            </button>
          ))
        ) : (
          <p className="text-sm text-neutral-500 text-center">Sign-in is disabled.</p>
        )}
      </div>
    </main>
  );
}
