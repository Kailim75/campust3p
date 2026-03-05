import { useRef } from "react";
import { PresentationHero } from "@/components/presentation/PresentationHero";
import { PresentationProblems } from "@/components/presentation/PresentationProblems";
import { PresentationGains } from "@/components/presentation/PresentationGains";
import { PresentationFeatures } from "@/components/presentation/PresentationFeatures";
import { PresentationDemoTimeline } from "@/components/presentation/PresentationDemoTimeline";
import { PresentationPricing } from "@/components/presentation/PresentationPricing";
import { PresentationFAQ } from "@/components/presentation/PresentationFAQ";
import { PresentationSecurity } from "@/components/presentation/PresentationSecurity";
import { PresentationLeadForm } from "@/components/presentation/PresentationLeadForm";
import { PresentationNav } from "@/components/presentation/PresentationNav";
import { PresentationFooter } from "@/components/presentation/PresentationFooter";

export default function Presentation() {
  const demoRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <PresentationNav
        onDemo={() => scrollTo(demoRef)}
        onContact={() => scrollTo(contactRef)}
      />
      <PresentationHero
        onDemo={() => scrollTo(demoRef)}
        onContact={() => scrollTo(contactRef)}
      />
      <PresentationProblems />
      <PresentationGains />
      <PresentationFeatures />
      <div ref={demoRef}>
        <PresentationDemoTimeline />
      </div>
      <PresentationPricing onContact={() => scrollTo(contactRef)} />
      <PresentationSecurity />
      <PresentationFAQ />
      <div ref={contactRef}>
        <PresentationLeadForm />
      </div>
      <PresentationFooter />
    </div>
  );
}
