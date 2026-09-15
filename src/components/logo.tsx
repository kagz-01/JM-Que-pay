import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8", className)}
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="15" fill="currentColor" className="text-fg" />
      <circle cx="16" cy="16" r="6.2" fill="none" stroke="#0b110e" strokeWidth="2.2" />
      <circle cx="16" cy="16" r="2.1" fill="#0b110e" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className="size-7" />
      <span className="font-display text-[1.35rem] leading-none tracking-tight">CuePay</span>
    </span>
  );
}
