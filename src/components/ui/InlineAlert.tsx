import type { ReactNode } from "react";

type AlertVariant = "success" | "error" | "warning" | "info";

interface InlineAlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<
  AlertVariant,
  { border: string; bg: string; icon: string; title: string }
> = {
  success: {
    border: "border-emerald-400/35",
    bg: "bg-emerald-500/10",
    icon: "text-emerald-300",
    title: "text-emerald-100",
  },
  error: {
    border: "border-red-400/35",
    bg: "bg-red-500/10",
    icon: "text-red-300",
    title: "text-red-100",
  },
  warning: {
    border: "border-amber-400/35",
    bg: "bg-amber-500/10",
    icon: "text-amber-300",
    title: "text-amber-100",
  },
  info: {
    border: "border-blue-400/35",
    bg: "bg-blue-500/10",
    icon: "text-blue-300",
    title: "text-blue-100",
  },
};

const icons: Record<AlertVariant, string> = {
  success: "\u2713",
  error: "\u2717",
  warning: "\u26A0",
  info: "\u2139",
};

function InlineAlert({
  variant = "info",
  title,
  children,
  className = "",
}: InlineAlertProps) {
  const s = variantStyles[variant];

  return (
    <div
      role="alert"
      className={`rounded-xl border ${s.border} ${s.bg} px-4 py-3 text-xs leading-6 ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <span className={`text-sm mt-0.5 ${s.icon}`} aria-hidden="true">
          {icons[variant]}
        </span>
        <div className="min-w-0">
          {title && (
            <p className={`font-semibold ${s.title}`}>{title}</p>
          )}
          <div className="text-slate-200">{children}</div>
        </div>
      </div>
    </div>
  );
}

export { InlineAlert };
export type { InlineAlertProps, AlertVariant };
