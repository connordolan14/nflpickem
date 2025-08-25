"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, DollarSign, Calendar } from "lucide-react";

export function LeagueManagement() {
  const leagues = [
    {
      id: "1",
      name: "Fantasy Football Pros",
      members: 24,
      entryFee: 50,
      status: "active",
      createdBy: "ahagy2015",
      startDate: "2024-09-05",
      endDate: "2024-12-29",
    },
    {
      id: "2",
      name: "Sunday Funday",
      members: 16,
      entryFee: 25,
      status: "active",
      createdBy: "sarah_smith",
      startDate: "2024-09-08",
      endDate: "2024-12-22",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">League Management</h2>
          <p className="text-muted-foreground">
            Monitor and manage all leagues
          </p>
        </div>
        <Button>Create League</Button>
      </div>

      <div className="grid gap-4">
        {leagues.map((league) => (
          <Card key={league.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Trophy className="h-12 w-12 text-primary" />
                  <div>
                    <h3 className="text-xl font-semibold">{league.name}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {league.members} members
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />${league.entryFee}{" "}
                        entry
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {league.startDate} - {league.endDate}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="default">{league.status}</Badge>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm">
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
