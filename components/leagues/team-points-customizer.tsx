"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface NFLTeam {
  id: string;
  nfl_team_code: string;
  display_name: string;
  logo: string;
  points_value: number;
}

interface TeamPointsCustomizerProps {
  teams: NFLTeam[];
  values: Record<string, number>;
  onValueChange: (teamId: string, value: number) => void;
}

export function TeamPointsCustomizer({
  teams,
  values,
  onValueChange,
}: TeamPointsCustomizerProps) {
  const getValueColor = (value: number) => {
    if (value >= 25) return "bg-green-100 text-green-800 border-green-200";
    if (value >= 17) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const validateUnique = () => {
    const allValues = Object.values(values);
    const uniqueValues = new Set(allValues);
    return allValues.length === uniqueValues.size;
  };

  const getDuplicateValues = () => {
    const valueCount: Record<number, string[]> = {};
    Object.entries(values).forEach(([teamId, value]) => {
      if (!valueCount[value]) valueCount[value] = [];
      valueCount[value].push(teamId);
    });
    return Object.entries(valueCount).filter(
      ([_, teamIds]) => teamIds.length > 1
    );
  };

  const duplicates = getDuplicateValues();
  const isValid = validateUnique();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Customize Team Point Values
          </h3>
          <p className="text-sm text-muted-foreground">
            Assign unique point values (1-32) to each NFL team. Higher values =
            more points when picked.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge
            variant={isValid ? "default" : "destructive"}
            className="text-xs"
          >
            {isValid ? "All Unique" : "Duplicates Found"}
          </Badge>
        </div>
      </div>

      {!isValid && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive font-medium mb-2">
            Duplicate values found:
          </p>
          <div className="space-y-1">
            {duplicates.map(([value, teamIds]) => (
              <p key={value} className="text-xs text-destructive">
                Value {value}:{" "}
                {teamIds
                  .map((id) => teams.find((t) => t.id === id)?.display_name)
                  .join(", ")}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {teams.map((team) => {
          const currentValue = values[team.id] || team.points_value;
          const isDuplicate = duplicates.some(([_, teamIds]) =>
            teamIds.includes(team.id)
          );

          return (
            <div
              key={team.id}
              className={`p-4 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col items-center gap-4 transition-all ${
                isDuplicate
                  ? "border-destructive/50 bg-destructive/5"
                  : "hover:shadow-md"
              }`}
            >
              {/* Logo + Team Name */}
              <div className="flex flex-col items-center gap-2">
                <img
                  src={
                    team.logo ||
                    `/abstract-geometric-shapes.png?height=120&width=120&query=${team.nfl_team_code} NFL team logo`
                  }
                  alt={team.display_name}
                  className="w-20 h-20 object-contain rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white p-2 shadow-md"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `/abstract-geometric-shapes.png?height=120&width=120&query=${team.nfl_team_code} NFL team logo`;
                  }}
                />
                <span className="text-base font-semibold text-center truncate">
                  {team.display_name}
                </span>
              </div>

              {/* Points Section */}
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Default:</span>
                  <Badge variant="outline" className="px-2 py-1">
                    {team.points_value}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Custom:</span>
                  <Input
                    id={`team-${team.id}`}
                    type="number"
                    min={1}
                    max={32}
                    value={currentValue}
                    onChange={(e) => {
                      const value = Number.parseInt(e.target.value) || 1;
                      onValueChange(team.id, Math.max(1, Math.min(32, value)));
                    }}
                    className={`h-8 text-sm w-20 border border-zinc-300 dark:border-zinc-700 ${
                      isDuplicate
                        ? "border-destructive/50 focus:border-destructive"
                        : ""
                    }`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded bg-green-200"></div>
            <span>High (25-32)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded bg-yellow-200"></div>
            <span>Medium (17-24)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded bg-red-200"></div>
            <span>Low (1-16)</span>
          </div>
        </div>
        <span>Total teams: {teams.length}</span>
      </div>
    </div>
  );
}
