"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Eye } from "lucide-react";
import { fetchJoinedLeagues, type JoinedLeague } from "@/lib/recent";

interface JoinedLeaguesProps {
  userId: string;
}

export function JoinedLeagues({ userId }: JoinedLeaguesProps) {
  const [leagues, setLeagues] = useState<JoinedLeague[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeagues() {
      try {
        const joinedLeagues = await fetchJoinedLeagues(userId);
        console.log("Fetched joined leagues:", joinedLeagues);
        setLeagues(joinedLeagues);
      } catch (error) {
        console.error("Error fetching joined leagues:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchLeagues();
  }, [userId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-card/80 border-border/50">
        <CardHeader>
          <CardTitle>Joined Leagues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse flex items-center space-x-3"
              >
                <div className="h-8 w-8 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/80 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Trophy className="h-5 w-5 mr-2 text-primary" />
            Joined Leagues
          </div>
          <Badge variant="outline" className="text-xs">
            {leagues.length} leagues
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {leagues.length === 0 ? (
          <div className="text-center py-6">
            <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              You haven't joined any leagues yet.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              User ID: {userId}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {leagues.map((league) => (
              <div
                key={league.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Trophy className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{league.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {formatDate(league.member_since)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      league.visibility === "public" ? "default" : "secondary"
                    }
                    className="text-xs"
                  >
                    {league.visibility}
                  </Badge>
                  <button className="p-1 hover:bg-muted rounded">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
