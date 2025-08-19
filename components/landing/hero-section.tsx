import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Trophy } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-accent/10" />
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative">
        <div className="text-center max-w-4xl mx-auto">
          <div className="flex justify-center mb-6">
            <div className="p-3 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/20">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black font-serif text-foreground mb-6 leading-tight">
            NFL <span className="text-primary">Pick Two</span>
            <br />
            <span className="text-2xl md:text-4xl lg:text-5xl font-semibold text-muted-foreground">
              Strategic NFL Fantasy
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            The ultimate NFL pick'em experience where strategy meets simplicity. Make your picks count in leagues that
            reward smart decisions.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="text-lg px-8 py-6 bg-primary hover:bg-primary/90">
              <Link href="/leagues/join">
                Join a League
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 backdrop-blur-sm bg-transparent">
              <Link href="/leagues/create">Create League</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
