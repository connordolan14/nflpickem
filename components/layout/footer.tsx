import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-muted/50 border-t border-border/50 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="text-2xl font-bold text-primary font-serif mb-4 block">
              NFL PickEm
            </Link>
            <p className="text-muted-foreground mb-4 max-w-md">
              The strategic NFL fantasy experience where every pick matters. Join thousands of fans making smarter
              picks.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Game</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/how-it-works" className="text-muted-foreground hover:text-primary transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/leagues" className="text-muted-foreground hover:text-primary transition-colors">
                  Browse Leagues
                </Link>
              </li>
              <li>
                <Link href="/leagues/create" className="text-muted-foreground hover:text-primary transition-colors">
                  Create League
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/help" className="text-muted-foreground hover:text-primary transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/50 mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 NFL PickEm. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
