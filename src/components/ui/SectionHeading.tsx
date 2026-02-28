interface SectionHeadingProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  as?: "h2" | "h3" | "h4";
  className?: string;
}

function SectionHeading({
  kicker,
  title,
  subtitle,
  as: Tag = "h2",
  className = "",
}: SectionHeadingProps) {
  const sizeClass =
    Tag === "h2"
      ? "text-[clamp(1.6rem,4vw,2.4rem)]"
      : Tag === "h3"
        ? "text-2xl"
        : "text-lg";

  return (
    <div className={className}>
      {kicker && (
        <p className="landing-mono text-xs text-cyan-100/80">{kicker}</p>
      )}
      <Tag
        className={`landing-mono ${kicker ? "mt-2" : ""} ${sizeClass} text-cyan-50`}
      >
        {title}
      </Tag>
      {subtitle && (
        <p className="text-muted mt-2 max-w-3xl text-sm">{subtitle}</p>
      )}
    </div>
  );
}

export { SectionHeading };
export type { SectionHeadingProps };
