"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { MyLeagues } from "@/components/dashboard/my-leagues";
import { WeeklyPicks } from "@/components/dashboard/weekly-picks";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { JoinedLeagues } from "@/components/dashboard/joined-leagues";
import { Header } from "@/components/layout/header";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/10">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/10">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-serif text-foreground mb-2">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your NFL Pick Two overview.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Stats and Leagues */}
          <div className="lg:col-span-2 space-y-6">
            <DashboardStats userId={user.id} />
            <MyLeagues userId={user.id} />
            <JoinedLeagues userId={user.id} />
          </div>

          {/* Right Column - Picks and Activity */}
          <div className="space-y-6">
            <WeeklyPicks userId={user.id} />
            <RecentActivity userId={user.id} />
          </div>
        </div>
      </main>
    </div>
  );
}
