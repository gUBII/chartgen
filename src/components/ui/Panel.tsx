import type { ReactNode } from "react";

type PanelTone = "cyan" | "emerald" | "blue" | "amber";

interface PanelProps {
  title?: string;
  kicker?: string;
  tone?: PanelTone;
  children: ReactNode;
  className?: string;
}

const toneClasses: Record<PanelTone, string> = {
  cyan: "border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-transparent",
  emerald:
    "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent",
  blue: "border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent",
  amber:
    "border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent",
};

const kickerTone: Record<PanelTone, string> = {
  cyan: "text-cyan-200",
  emerald: "text-emerald-200",
  blue: "text-blue-200",
  amber: "text-amber-200",
};

const titleTone: Record<PanelTone, string> = {
  cyan: "text-cyan-50",
  emerald: "text-emerald-50",
  blue: "text-blue-50",
  amber: "text-amber-50",
};

function Panel({
  title,
  kicker,
  tone = "cyan",
  children,
  className = "",
}: PanelProps) {
  return (
    <section
      className={`futuristic-panel p-6 ${toneClasses[tone]} ${className}`}
    >
      {kicker && (
        <p className={`landing-mono text-xs ${kickerTone[tone]}`}>{kicker}</p>
      )}
      {title && (
        <h3 className={`landing-mono mt-2 text-2xl ${titleTone[tone]}`}>
          {title}
        </h3>
      )}
      {(kicker || title) && children ? (
        <div className="mt-4">{children}</div>
      ) : (
        children
      )}
    </section>
  );
}

export { Panel };
export type { PanelProps, PanelTone };
