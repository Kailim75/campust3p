import { useRef, useState } from "react";
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
import { Reveal } from "@/components/presentation/presentation-motion";
import { PresentationFooter } from "@/components/presentation/PresentationFooter";

export default function Presentation() {
  const demoRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);
  // Offre cliquée dans la grille tarifaire, présélectionnée dans le
  // formulaire de contact (retour directeur du 23/07).
  const [offre, setOffre] = useState<string | null>(null);

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
        <Reveal><PresentationDemoTimeline/></Reveal>
      </div>
      <Reveal><PresentationPricing onSelectPlan={(plan) => { setOffre(plan); scrollTo(contactRef); }} /></Reveal>
      <Reveal><PresentationSecurity/></Reveal>
      <Reveal><PresentationFAQ/></Reveal>
      <div ref={contactRef}>
        <Reveal><PresentationLeadForm offre={offre} /></Reveal>
      </div>
      <PresentationFooter />
    </div>
  );
}
