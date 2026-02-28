import type { ReactNode } from "react";

type BadgeVariant = "info" | "success" | "warning" | "danger" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  info: "border-blue-300/45 bg-blue-400/20 text-blue-100",
  success: "border-emerald-300/45 bg-emerald-400/20 text-emerald-100",
  warning: "border-amber-300/45 bg-amber-400/20 text-amber-100",
  danger: "border-red-400/45 bg-red-500/20 text-red-100",
  neutral: "border-slate-400/30 bg-slate-500/15 text-slate-200",
};

function Badge({ variant = "neutral", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export { Badge };
export type { BadgeProps, BadgeVariant };
