"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"
import { Menu, X, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-primary font-serif">
            NFL PickEm
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {user ? (
              <>
                <Link href="/dashboard" className="text-foreground hover:text-primary transition-colors">
                  Dashboard
                </Link>
                <Link href="/leagues" className="text-foreground hover:text-primary transition-colors">
                  My Leagues
                </Link>
                <Button onClick={signOut} variant="outline" size="sm">
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth" className="text-foreground hover:text-primary transition-colors">
                  Sign In
                </Link>
                <Button asChild>
                  <Link href="/auth">Get Started</Link>
                </Button>
              </>
            )}

            <Button variant="ghost" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 border-t border-border/50 pt-4">
            <div className="flex flex-col space-y-3">
              {user ? (
                <>
                  <Link href="/dashboard" className="text-foreground hover:text-primary transition-colors">
                    Dashboard
                  </Link>
                  <Link href="/leagues" className="text-foreground hover:text-primary transition-colors">
                    My Leagues
                  </Link>
                  <Button onClick={signOut} variant="outline" size="sm" className="w-fit bg-transparent">
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/auth" className="text-foreground hover:text-primary transition-colors">
                    Sign In
                  </Link>
                  <Button asChild size="sm" className="w-fit">
                    <Link href="/auth">Get Started</Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
