"use client";

import Image from "next/image";
import { useState } from "react";

function ProfileImage() {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return (
      <div className="w-48 h-48 rounded-full border-2 border-cyan-400/50 bg-gray-800/50 flex items-center justify-center">
        <p className="text-xs text-gray-400 text-center px-4">Founder profile</p>
      </div>
    );
  }

  return (
    <Image
      src="/gubii-profile.png"
      alt="Farhan Rashid (gUBII)"
      width={192}
      height={192}
      className="w-48 h-48 rounded-full object-cover border-2 border-cyan-400/50 shadow-lg"
      onError={() => setImageError(true)}
    />
  );
}

export function FounderSection() {
  return (
    <section className="grid gap-4 md:grid-cols-[1fr,1.4fr]">
      <div className="futuristic-panel p-8 flex flex-col items-center justify-center min-h-96 border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-transparent">
        <ProfileImage />
      </div>
      <div className="futuristic-panel p-8 border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-transparent">
        <p className="landing-mono text-xs text-cyan-300">Founder Authority</p>
        <h3 className="landing-mono mt-2 text-3xl text-cyan-50">Farhan Rashid (gUBII)</h3>
        <p className="text-muted mt-4 text-sm leading-relaxed">
          Farhan Rashid (gUBII) is a governance-first engineer and builder with security-led product instincts.
          As a founding security engineer in Nexis365 environments, he supported major migrations including legacy GoodwillCare into Nexis365-hosted operations and built operational foundations with auditability in mind.
        </p>
        <p className="text-muted mt-4 text-sm leading-relaxed">
          Chartgen is Farhan&apos;s independently authored compliance intelligence product, built as an audit modelling and documentation integrity layer for NDIS-aligned providers. The focus is evidence scaffolding that can withstand scrutiny: traceability, gap detection, and governance structure.
        </p>
        <a
          href="https://github.com/gUBII"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex rounded-full border border-cyan-200/50 bg-cyan-300/15 px-4 py-2 text-xs font-semibold text-cyan-50 hover:bg-cyan-300/25 transition"
        >
          Founder Profile
        </a>
      </div>
    </section>
  );
}
