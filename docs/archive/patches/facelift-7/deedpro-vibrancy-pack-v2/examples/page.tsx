
import Background from "@/components/Background/Background";
import DeedHero from "@/components/DeedHero";
import StickyCTA from "@/components/StickyCTA";
import InteractivePricing from "@/components/InteractivePricing";

export default function Page(){
  return (
    <main className="relative">
      <Background />
      <DeedHero />
      <div className="mt-24">
        <InteractivePricing />
      </div>
      <StickyCTA />
    </main>
  );
}
