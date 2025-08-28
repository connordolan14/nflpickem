import { HeroSection } from "@/components/landing/hero-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { PublicLeaguesSection } from "@/components/landing/public-leagues-section"
import { GameConceptSection } from "@/components/landing/game-concept-section"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { RedirectOnAuth } from "@/components/landing/redirect-on-auth"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/10">
  <RedirectOnAuth />
      <Header />
      <main>
        <HeroSection />
        <GameConceptSection />
        <FeaturesSection />
        <PublicLeaguesSection />
      </main>
      <Footer />
    </div>
  )
}
