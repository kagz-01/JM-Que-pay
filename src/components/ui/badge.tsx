import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide",
  {
    variants: {
      tone: {
        idle: "bg-accent/15 text-accent",
        busy: "bg-danger/15 text-danger",
        offline: "bg-subtle/20 text-muted",
        maintenance: "bg-warn/15 text-warn",
        info: "bg-elevated text-muted",
        warn: "bg-warn/15 text-warn",
        critical: "bg-danger/15 text-danger",
        paid: "bg-accent/15 text-accent",
        pending: "bg-warn/15 text-warn",
        released: "bg-accent/15 text-accent",
        failed: "bg-danger/15 text-danger",
        expired: "bg-subtle/20 text-muted",
      },
    },
    defaultVariants: { tone: "info" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
