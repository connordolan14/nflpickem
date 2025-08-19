import { Card, CardContent } from "@/components/ui/card"
import { Smartphone, BarChart3, Shield, Zap } from "lucide-react"

export function FeaturesSection() {
  const features = [
    {
      icon: Zap,
      title: "Custom League Creation",
      description: "Set your own rules, point values, and league settings. Make it uniquely yours.",
    },
    {
      icon: BarChart3,
      title: "Real-time Standings",
      description: "Track your progress with live leaderboards and detailed scoring breakdowns.",
    },
    {
      icon: Smartphone,
      title: "Mobile Friendly",
      description: "Make picks on the go with our responsive design optimized for all devices.",
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Your data is protected with enterprise-grade security and 99.9% uptime.",
    },
  ]

  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-serif text-foreground mb-4">Why Choose NFL PickEm?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built for serious NFL fans who want more than just luck-based fantasy games.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="backdrop-blur-sm bg-card/80 border-border/50 hover:bg-card/90 transition-all duration-300 group"
            >
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-full bg-accent/10 border border-accent/20 group-hover:bg-accent/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-accent" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
