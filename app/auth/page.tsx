"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

export default function AuthPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: "http://localhost:3000/dashboard",
        },
      })

      if (error) {
        setMessage(error.message)
      } else {
        setMessage("Check your email for the login link!")
      }
    } catch (error) {
      setMessage("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-nfl-primary via-nfl-secondary to-nfl-accent flex items-center justify-center p-4">
      <Card className="w-full max-w-md backdrop-blur-md bg-white/10 border-white/20">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-white">
            <Link href="/">NFL PickEm</Link>
          </CardTitle>
          <CardDescription className="text-white/70">Sign in with your email address</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-white">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            </div>
            <Button type="submit" className="w-full bg-white text-nfl-primary hover:bg-white/90" disabled={loading}>
              {loading ? "Sending..." : "Send Magic Link"}
            </Button>
          </form>
          {message && <p className="mt-4 text-center text-white/80 text-sm">{message}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
