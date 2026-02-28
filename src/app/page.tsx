import {
  HeroSection,
  ReleasePortal,
  OwnershipSection,
  CorePositioning,
  CapabilitiesSection,
  ComplianceSection,
  FounderSection,
  EnterpriseActions,
} from "../components/home";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-7xl px-6 pt-10 pb-16 space-y-6">
      <HeroSection />
      <ReleasePortal />
      <OwnershipSection />
      <CorePositioning />
      <CapabilitiesSection />
      <ComplianceSection />
      <FounderSection />
      <EnterpriseActions />
    </main>
  );
}
