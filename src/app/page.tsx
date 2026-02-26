import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-7xl px-6 pt-10 pb-16">
      <section className="futuristic-panel futuristic-grid relative p-8 sm:p-10">
        <p className="landing-mono text-xs text-cyan-100/80">
          Clinical Workflow Command Deck
        </p>
        <h2 className="landing-mono mt-3 max-w-4xl text-4xl leading-[1.05] text-cyan-50 sm:text-6xl">
          Chartgen
        </h2>
        <p className="text-muted mt-4 max-w-2xl text-sm sm:text-base">
          Future-forward chart generation for meal intelligence, medication
          administration, and KPI observability.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Link href="/mar" className="futuristic-panel p-4 transition hover:-translate-y-0.5">
            <p className="landing-mono text-xs text-cyan-100/70">Tab 01</p>
            <h3 className="landing-mono mt-2 text-lg text-white">MAR</h3>
            <p className="text-muted mt-2 text-xs">Medication Administration Records</p>
          </Link>

          <Link
            href="/mealtime-chartgen"
            className="futuristic-panel p-4 transition hover:-translate-y-0.5"
          >
            <p className="landing-mono text-xs text-cyan-100/70">Tab 02</p>
            <h3 className="landing-mono mt-2 text-lg text-white">Mealtime Chartgen</h3>
            <p className="text-muted mt-2 text-xs">Generate and review meal chart batches</p>
          </Link>

          <Link href="/kpigen" className="futuristic-panel p-4 transition hover:-translate-y-0.5">
            <p className="landing-mono text-xs text-cyan-100/70">Tab 03</p>
            <h3 className="landing-mono mt-2 text-lg text-white">KPIgen</h3>
            <p className="text-muted mt-2 text-xs">Reserved for KPI pipeline workspace</p>
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-[1.4fr,1fr]">
        <div className="futuristic-panel p-6">
          <p className="landing-mono text-xs text-cyan-100/80">Status Bus</p>
          <p className="mt-3 text-sm leading-6 text-slate-100">
            Runtime is live. Use the tabs to move between MAR and Mealtime
            Chartgen flows. KPIgen is intentionally scaffolded as a blank page.
          </p>
        </div>
        <div className="futuristic-panel p-6">
          <p className="landing-mono text-xs text-cyan-100/80">Launch</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/mealtime-chartgen"
              className="landing-mono rounded-full border border-cyan-200/50 bg-cyan-300/15 px-4 py-2 text-xs text-cyan-50"
            >
              Open Mealtime
            </Link>
            <Link
              href="/mar"
              className="landing-mono rounded-full border border-emerald-200/50 bg-emerald-300/15 px-4 py-2 text-xs text-emerald-50"
            >
              Open MAR
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
