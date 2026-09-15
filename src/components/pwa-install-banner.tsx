/**
 * CuePay PWA Install Prompt
 *
 * On Android/Chrome, the browser fires `beforeinstallprompt` before the user
 * installs the app. We capture that event and show our own branded banner so
 * users know they can install CuePay to their home screen.
 *
 * On iOS, there's no install API — we show a simple "tap Share → Add to Home Screen"
 * callout instead (detected via userAgent + standalone check).
 *
 * The banner auto-dismisses after install and is hidden once installed.
 */
import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";

type InstallState =
  | { kind: "idle" }
  | { kind: "android"; prompt: BeforeInstallPromptEvent }
  | { kind: "ios" }
  | { kind: "installed" };

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectPlatform(): "android" | "ios" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "other";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error — iOS-specific
    window.navigator?.standalone === true
  );
}

export function PwaInstallBanner() {
  const [state, setState] = useState<InstallState>({ kind: "idle" });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Already installed — never show
    if (isStandalone()) {
      setState({ kind: "installed" });
      return;
    }

    // Check if already dismissed in this session
    const wasDismissed = sessionStorage.getItem("cuepay-pwa-dismissed");
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    const platform = detectPlatform();

    if (platform === "ios") {
      // Only show after a brief delay on iOS
      const t = setTimeout(() => setState({ kind: "ios" }), 3000);
      return () => clearTimeout(t);
    }

    // Android: wait for the browser's install prompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setState({ kind: "android", prompt: e as BeforeInstallPromptEvent });
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem("cuepay-pwa-dismissed", "1");
    setDismissed(true);
  };

  const handleAndroidInstall = async () => {
    if (state.kind !== "android") return;
    await state.prompt.prompt();
    const { outcome } = await state.prompt.userChoice;
    if (outcome === "accepted") setState({ kind: "installed" });
    else handleDismiss();
  };

  if (dismissed || state.kind === "idle" || state.kind === "installed") return null;

  return (
    <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-3 right-3 z-50 md:bottom-4 md:left-auto md:right-4 md:w-80">
      <div className="rounded-2xl border border-white/10 bg-neutral-900 p-4 shadow-2xl backdrop-blur-sm">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <img
            src="/__grok/icon-180.png"
            alt="CuePay"
            className="size-12 shrink-0 rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white text-sm">CuePay</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              {state.kind === "ios"
                ? "Add to your Home Screen for the best experience"
                : "Install the app for quick access"}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="shrink-0 rounded-full p-1 text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* CTA */}
        <div className="mt-3">
          {state.kind === "android" ? (
            <button
              onClick={handleAndroidInstall}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white active:scale-95 transition-transform"
            >
              <Download className="size-4" />
              Add to Home Screen
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-neutral-800 px-3 py-2.5 text-xs text-neutral-300">
              <Share className="size-4 shrink-0 text-blue-400" />
              Tap <strong className="text-white mx-1">Share</strong> then{" "}
              <strong className="text-white ml-1">Add to Home Screen</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
