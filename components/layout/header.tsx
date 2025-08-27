"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Menu, X, User } from "lucide-react";
import { ProfileModal } from "./profile-modal";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();

  // Make Picks flow: load user's leagues and prompt if multiple
  const [leaguePickerOpen, setLeaguePickerOpen] = useState(false);
  const [leagues, setLeagues] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>("");

  useEffect(() => {
    const loadLeagues = async () => {
      if (!user) {
        setLeagues([]);
        return;
      }
      const { data, error } = await supabase
        .from("league_members")
        .select("league_id, leagues(name)")
        .eq("user_id", user.id);
      if (error) {
        console.error("Failed to load user leagues", error);
        setLeagues([]);
        return;
      }
      const opts = (data || []).map((row: any) => ({
        id: String(row.league_id),
        name:
          Array.isArray(row.leagues) && row.leagues[0]
            ? row.leagues[0].name
            : row.leagues?.name || "League",
      }));
      setLeagues(opts);
      if (opts.length === 1) setSelectedLeagueId(opts[0].id);
    };
    loadLeagues();
  }, [user]);

  const handleMakePicks = () => {
    if (!user) {
      router.push("/auth");
      return;
    }
    if (leagues.length === 1) {
      router.push(`/leagues/${leagues[0].id}/picks`);
      return;
    }
    setLeaguePickerOpen(true);
  };

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
                <Link
                  href="/dashboard"
                  className="text-foreground hover:text-primary transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/leagues"
                  className="text-foreground hover:text-primary transition-colors"
                >
                  Leagues
                </Link>
                <Button onClick={handleMakePicks} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Make Picks
                </Button>
                {user.role === "admin" && (
                  <Link
                    href="/admin"
                    className="text-foreground hover:text-primary transition-colors"
                  >
                    Admin
                  </Link>
                )}
                <Button onClick={signOut} variant="outline" size="sm">
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link
                  href="/auth"
                  className="text-foreground hover:text-primary transition-colors"
                >
                  Sign In
                </Link>
                <Button asChild>
                  <Link href="/auth">Get Started</Link>
                </Button>
              </>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsProfileModalOpen(true)}
            >
              <User className="h-4 w-4" />
            </Button>
            <ThemeToggle />
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 border-t border-border/50 pt-4">
            <div className="flex flex-col space-y-3">
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-foreground hover:text-primary transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/leagues"
                    className="text-foreground hover:text-primary transition-colors"
                  >
                    Leagues
                  </Link>
                  {user.role === "admin" && (
                    <Link
                      href="/admin"
                      className="text-foreground hover:text-primary transition-colors"
                    >
                      Admin
                    </Link>
                  )}
                  <Button
                    onClick={() => setIsProfileModalOpen(true)}
                    variant="ghost"
                    size="sm"
                    className="w-fit"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Button>
                  <Button
                    onClick={signOut}
                    variant="outline"
                    size="sm"
                    className="w-fit bg-transparent"
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth"
                    className="text-foreground hover:text-primary transition-colors"
                  >
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

      {/* Make Picks: League Picker */}
      <Dialog open={leaguePickerOpen} onOpenChange={setLeaguePickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select a League</DialogTitle>
            <DialogDescription>
              Choose a league to make your weekly picks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="leagueSelect">League</Label>
            <Select
              value={selectedLeagueId}
              onValueChange={(v) => setSelectedLeagueId(v)}
            >
              <SelectTrigger id="leagueSelect">
                <SelectValue placeholder="Pick a league" />
              </SelectTrigger>
              <SelectContent>
                {leagues.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              disabled={!selectedLeagueId}
              onClick={() => {
                if (!selectedLeagueId) return;
                setLeaguePickerOpen(false);
                router.push(`/leagues/${selectedLeagueId}/picks`);
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </header>
  );
}
