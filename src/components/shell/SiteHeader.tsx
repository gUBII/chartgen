import Link from "next/link";

interface SiteHeaderProps {
  version?: string;
  authorUrl?: string;
  disclaimerShort?: string;
  disclaimerLong?: string;
}

function SiteHeader({
  version = "v3.5",
  authorUrl = "https://github.com/gUBII",
  disclaimerShort = "Independently authored. Deployed in Nexis365-hosted environments.",
  disclaimerLong = "Independently authored product. Deployed in Nexis365-hosted environments supporting GoodwillCare and COHS.",
}: SiteHeaderProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="brand-kicker">Chartgen by gUBII</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-4xl">
            <Link href="/" className="brand-link">
              Chartgen
            </Link>
          </h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="inline-block rounded-full border border-emerald-400/50 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200 uppercase tracking-widest">
            {version}
          </span>
          <a
            href={authorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cyan-300 hover:text-cyan-100 transition"
            title="Visit creator on GitHub"
          >
            by gUBII &uarr;
          </a>
        </div>
      </div>
      <p className="mt-2 text-[10px] leading-4 text-cyan-100/75 sm:hidden">
        {disclaimerShort}
      </p>
      <p className="mt-3 hidden text-[11px] leading-5 text-cyan-100/75 max-w-4xl sm:block">
        {disclaimerLong}
      </p>
    </div>
  );
}

export { SiteHeader };
export type { SiteHeaderProps };
