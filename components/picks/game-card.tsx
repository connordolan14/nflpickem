"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Lock } from "lucide-react";

interface GameData {
  id: string;
  week: number;
  home_team_id: string;
  away_team_id: string;
  home_team: string;
  home_code: string;
  away_team: string;
  away_code: string;
  home_points: number;
  away_points: number;
  kickoff_ts: string;
  status: string;
  winner_team_id: string | null;
  home_logo: string | null;
  away_logo: string | null;
}

interface UsedTeam {
  team_id: string;
  week: number;
}

interface GameCardProps {
  game: GameData;
  gameIndex: number;
  selectedTeams: string[];
  usedTeams: UsedTeam[];
  onTeamSelect: (teamId: string, gameId: string) => void;
  disabled: boolean;
}

export function GameCard({
  game,
  gameIndex,
  selectedTeams,
  usedTeams,
  onTeamSelect,
  disabled,
}: GameCardProps) {
  const isGameLocked = new Date(game.kickoff_ts) < new Date();
  const isHomeSelected = selectedTeams.includes(game.home_team_id);
  const isAwaySelected = selectedTeams.includes(game.away_team_id);
  const isHomeUsed = usedTeams.some(
    (used) => used.team_id === game.home_team_id
  );
  const isAwayUsed = usedTeams.some(
    (used) => used.team_id === game.away_team_id
  );
  const homeUsedWeek = usedTeams.find(
    (used) => used.team_id === game.home_team_id
  )?.week;
  const awayUsedWeek = usedTeams.find(
    (used) => used.team_id === game.away_team_id
  )?.week;

  const formatKickoffTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getTeamCardClass = (
    teamId: string,
    isSelected: boolean,
    isUsed: boolean
  ) => {
    let baseClass =
      "flex-1 p-3 rounded-lg border transition-all cursor-pointer hover:bg-muted/30";

    if (disabled || isGameLocked) {
      baseClass += " opacity-50 cursor-not-allowed";
    } else if (isUsed) {
      baseClass += " bg-muted/50 border-muted cursor-not-allowed opacity-60";
    } else if (isSelected) {
      baseClass += " bg-primary/10 border-primary/50 ring-2 ring-primary/20";
    } else {
      baseClass += " bg-card/50 border-border/50 hover:border-primary/30";
    }

    return baseClass;
  };

  return (
    <Card className="backdrop-blur-sm bg-card/50 border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="h-4 w-4 mr-1" />
            {formatKickoffTime(game.kickoff_ts)}
          </div>
          {isGameLocked && (
            <Badge variant="outline" className="text-xs">
              <Lock className="h-3 w-3 mr-1" />
              Locked
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* Away Team */}
          <div
            className={getTeamCardClass(
              game.away_team_id,
              isAwaySelected,
              isAwayUsed
            )}
            onClick={() =>
              !disabled &&
              !isGameLocked &&
              !isAwayUsed &&
              onTeamSelect(game.away_team_id, game.id)
            }
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <img
                  src={game.away_logo || "/placeholder-logo.svg"}
                  alt={game.away_team}
                  className="w-8 h-8 rounded object-contain bg-white"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder-logo.svg";
                  }}
                />
                <div>
                  <p className="font-medium text-foreground text-sm">
                    {game.away_team}
                  </p>
                  {isAwayUsed && (
                    <p className="text-xs text-muted-foreground">
                      Used Week {awayUsedWeek}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {game.away_points} pts
              </Badge>
            </div>
          </div>

          <div className="text-muted-foreground font-medium">@</div>

          {/* Home Team */}
          <div
            className={getTeamCardClass(
              game.home_team_id,
              isHomeSelected,
              isHomeUsed
            )}
            onClick={() =>
              !disabled &&
              !isGameLocked &&
              !isHomeUsed &&
              onTeamSelect(game.home_team_id, game.id)
            }
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <img
                  src={game.home_logo || "/placeholder-logo.svg"}
                  alt={game.home_team}
                  className="w-8 h-8 rounded object-contain bg-white"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder-logo.svg";
                  }}
                />
                <div>
                  <p className="font-medium text-foreground text-sm">
                    {game.home_team}
                  </p>
                  {isHomeUsed && (
                    <p className="text-xs text-muted-foreground">
                      Used Week {homeUsedWeek}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {game.home_points} pts
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

