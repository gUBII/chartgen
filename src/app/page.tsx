"use client";

import Link from "next/link";
import { useState } from "react";

function ProfileImage() {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return (
      <div className="w-48 h-48 rounded-full border-2 border-cyan-400/50 bg-gray-800/50 flex items-center justify-center">
        <p className="text-xs text-gray-400 text-center px-4">Profile photo</p>
      </div>
    );
  }

  return (
    <img
      src="/gubii-profile.png"
      alt="gUBII Profile"
      className="w-48 h-48 rounded-full object-cover border-2 border-cyan-400/50 shadow-lg"
      onError={() => setImageError(true)}
    />
  );
}

export default function HomePage() {
  return (
    <main className="mx-auto max-w-7xl px-6 pt-10 pb-16">
      {/* Hero Section */}
      <section className="futuristic-panel futuristic-grid relative p-8 sm:p-12 mb-8">
        <p className="landing-mono text-xs text-cyan-100/80">
          Clinical Workflow Command Deck
        </p>
        <h2 className="landing-mono mt-3 max-w-4xl text-4xl leading-[1.05] text-cyan-50 sm:text-6xl">
          Chartgen
        </h2>
        <p className="text-muted mt-4 max-w-2xl text-sm sm:text-base">
          Future-forward chart generation for meal intelligence, medication
          administration, and KPI observability. Built by{" "}
          <a
            href="https://github.com/gUBII"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-300 hover:text-cyan-100 transition underline"
          >
            gUBII
          </a>
          .
        </p>

        {/* Feature Cards */}
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          <Link href="/mar" className="futuristic-panel p-5 transition hover:-translate-y-1 group">
            <p className="landing-mono text-xs text-cyan-100/70 group-hover:text-cyan-100">
              Tab 01
            </p>
            <h3 className="landing-mono mt-2 text-lg text-white group-hover:text-cyan-100 transition">
              MAR
            </h3>
            <p className="text-muted mt-2 text-xs">Medication Administration Records</p>
            <div className="mt-4 h-px bg-gradient-to-r from-cyan-500/20 to-transparent" />
          </Link>

          <Link
            href="/mealtime-chartgen"
            className="futuristic-panel p-5 transition hover:-translate-y-1 group"
          >
            <p className="landing-mono text-xs text-cyan-100/70 group-hover:text-cyan-100">
              Tab 02
            </p>
            <h3 className="landing-mono mt-2 text-lg text-white group-hover:text-emerald-100 transition">
              Mealtime Chartgen
            </h3>
            <p className="text-muted mt-2 text-xs">Generate and review meal chart batches</p>
            <div className="mt-4 h-px bg-gradient-to-r from-emerald-500/20 to-transparent" />
          </Link>

          <Link href="/kpigen" className="futuristic-panel p-5 transition hover:-translate-y-1 group">
            <p className="landing-mono text-xs text-cyan-100/70 group-hover:text-cyan-100">
              Tab 03
            </p>
            <h3 className="landing-mono mt-2 text-lg text-white group-hover:text-blue-100 transition">
              KPIgen
            </h3>
            <p className="text-muted mt-2 text-xs">Reserved for KPI pipeline workspace</p>
            <div className="mt-4 h-px bg-gradient-to-r from-blue-500/20 to-transparent" />
          </Link>
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="grid gap-4 md:grid-cols-[1.4fr,1fr] mb-8">
        <div className="futuristic-panel p-6">
          <p className="landing-mono text-xs text-cyan-100/80">Status Bus</p>
          <p className="mt-3 text-sm leading-6 text-slate-100">
            Runtime is live. Use the tabs to move between MAR and Mealtime
            Chartgen flows. KPIgen is intentionally scaffolded as a blank page.
          </p>
          <div className="mt-5 pt-5 border-t border-cyan-500/20">
            <p className="text-xs text-cyan-300 font-semibold">System Status</p>
            <p className="mt-2 text-xs text-emerald-400">✓ All endpoints operational</p>
          </div>
        </div>
        <div className="futuristic-panel p-6">
          <p className="landing-mono text-xs text-cyan-100/80">Quick Launch</p>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              href="/mealtime-chartgen"
              className="landing-mono rounded-full border border-cyan-200/50 bg-cyan-300/15 px-4 py-2 text-xs text-cyan-50 hover:bg-cyan-300/25 transition text-center"
            >
              Open Mealtime
            </Link>
            <Link
              href="/mar"
              className="landing-mono rounded-full border border-emerald-200/50 bg-emerald-300/15 px-4 py-2 text-xs text-emerald-50 hover:bg-emerald-300/25 transition text-center"
            >
              Open MAR
            </Link>
          </div>
        </div>
      </section>

      {/* Profile Section */}
      <section className="grid gap-4 md:grid-cols-[1fr,1.4fr] my-8">
        <div className="futuristic-panel p-8 flex flex-col items-center justify-center min-h-96 border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-transparent">
          <ProfileImage />
        </div>
        <div className="futuristic-panel p-8 border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-transparent">
          <p className="landing-mono text-xs text-cyan-300">About the Creator</p>
          <h3 className="landing-mono mt-2 text-3xl text-cyan-50">Who is gUBII?</h3>
          <p className="text-muted mt-4 text-sm leading-relaxed">
            gUBII is a clinical data engineer passionate about building tools that transform
            healthcare workflows. Chartgen represents years of research into patient safety,
            audit integrity, and operational excellence in clinical settings.
          </p>
          <p className="text-muted mt-4 text-sm leading-relaxed">
            This platform combines advanced data generation, governance controls, and audit-ledger
            immutability to create a trustworthy system for clinical teams. Every feature is
            designed with real clinical workflows in mind.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="https://github.com/gUBII"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-cyan-200/50 bg-cyan-300/15 px-4 py-2 text-xs font-semibold text-cyan-50 hover:bg-cyan-300/25 transition"
            >
              GitHub Profile
            </a>
            <a
              href="https://wa.me/61423016859?text=Hi%20gUBII%2C%20I%27d%20like%20to%20support%20Chartgen"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200/50 bg-emerald-400/20 px-4 py-2 text-xs font-semibold text-emerald-50 hover:bg-emerald-400/30 transition"
            >
              Get in Touch
            </a>
          </div>
        </div>
      </section>

      {/* Donation Section */}
      <section className="futuristic-panel p-8 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="landing-mono text-xs text-emerald-300">Support the Project</p>
            <h3 className="landing-mono mt-2 text-2xl text-emerald-50">Help gUBII Continue Building</h3>
            <p className="text-muted mt-3 text-sm max-w-md">
              Like Chartgen? Your support helps fund future development, maintenance,
              and clinical integration improvements.
            </p>
          </div>
          <a
            href="https://wa.me/61423016859?text=I%27d%20like%20to%20donate%20to%20support%20Chartgen%20development"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-200/50 bg-emerald-400/20 px-6 py-3 text-sm font-semibold text-emerald-50 hover:bg-emerald-400/35 transition whitespace-nowrap"
          >
            Donate via WhatsApp
          </a>
        </div>
      </section>
    </main>
  );
}
