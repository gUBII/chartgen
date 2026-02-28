import Link from "next/link";

function SiteFooter() {
  return (
    <footer className="relative z-2 border-t border-cyan-400/15 mt-12">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-8 sm:grid-cols-3">
          {/* Product */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-200/80">
              Product
            </p>
            <ul className="mt-3 space-y-2 text-xs text-slate-300">
              <li>
                <Link href="/" className="hover:text-cyan-100 transition">
                  Overview
                </Link>
              </li>
              <li>
                <Link
                  href="/whats-new"
                  className="hover:text-cyan-100 transition"
                >
                  Release Notes
                </Link>
              </li>
              <li>
                <Link
                  href="/deployment-notes"
                  className="hover:text-cyan-100 transition"
                >
                  Deployment Docs
                </Link>
              </li>
              <li>
                <Link
                  href="/audit-readiness"
                  className="hover:text-cyan-100 transition"
                >
                  Audit Readiness
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-200/80">
              Legal &amp; Governance
            </p>
            <ul className="mt-3 space-y-2 text-xs text-slate-300">
              <li className="text-slate-400">
                Privacy Policy <span className="text-[10px]">(coming soon)</span>
              </li>
              <li className="text-slate-400">
                Terms of Use <span className="text-[10px]">(coming soon)</span>
              </li>
              <li>
                <a
                  href="mailto:f.rashid6997@gmail.com"
                  className="hover:text-cyan-100 transition"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Standards */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-200/80">
              NDIS Standards
            </p>
            <ul className="mt-3 space-y-2 text-xs text-slate-300">
              <li>
                <a
                  href="https://www.ndiscommission.gov.au/rules-and-standards/ndis-practice-standards"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan-100 transition"
                >
                  Practice Standards Overview
                </a>
              </li>
              <li>
                <a
                  href="https://www.ndiscommission.gov.au/rules-and-standards/ndis-practice-standards/core-module-provision-supports-environment"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan-100 transition"
                >
                  Provision of Supports
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-cyan-400/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[10px] text-slate-500">
            Chartgen by gUBII. Independently authored. Deployed in
            Nexis365-hosted environments.
          </p>
          <a
            href="https://github.com/gUBII"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-cyan-400/60 hover:text-cyan-300 transition"
          >
            github.com/gUBII
          </a>
        </div>
      </div>
    </footer>
  );
}

export { SiteFooter };
