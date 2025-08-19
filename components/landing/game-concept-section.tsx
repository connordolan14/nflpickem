import { Card, CardContent } from "@/components/ui/card"
import { Users, Calendar, Target, Clock } from "lucide-react"

export function GameConceptSection() {
  const concepts = [
    {
      icon: Target,
      title: "Pick 2 Teams Weekly",
      description: "Select exactly 2 NFL teams each week to earn points based on their performance.",
    },
    {
      icon: Calendar,
      title: "Use Each Team Once",
      description: "Strategic depth - you can only pick each NFL team once per season. Choose wisely!",
    },
    {
      icon: Clock,
      title: "4 Bye Weeks Allowed",
      description: "Skip up to 4 weeks during the season when you need a strategic break.",
    },
    {
      icon: Users,
      title: "Compete with Friends",
      description: "Create private leagues or join public competitions with NFL fans worldwide.",
    },
  ]

  return (
    <section className="py-16 lg:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-serif text-foreground mb-4">How It Works</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Simple rules, strategic gameplay. Master the art of NFL team selection.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {concepts.map((concept, index) => (
            <Card
              key={index}
              className="backdrop-blur-sm bg-card/80 border-border/50 hover:bg-card/90 transition-all duration-300"
            >
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
                    <concept.icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{concept.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{concept.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
