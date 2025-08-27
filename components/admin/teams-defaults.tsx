"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Team = {
  id: number;
  display_name: string;
  nfl_team_code: string;
  logo: string | null;
  points_value: number;
};

export function TeamsDefaultsAdmin() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [draft, setDraft] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, display_name, nfl_team_code, logo, points_value")
        .order("display_name");
      if (error) {
        console.error(error);
        setError("Failed to load teams");
        return;
      }
      setTeams((data as any[]) as Team[]);
      const d: Record<number, number> = {};
      (data || []).forEach((t: any) => (d[t.id] = t.points_value ?? 1));
      setDraft(d);
    };
    load();
  }, []);

  const handleChange = (id: number, value: number) => {
    setDraft((prev) => ({ ...prev, [id]: Math.max(1, Math.min(32, value)) }));
    setSaved(false);
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");
    setSaved(false);
    try {
      // Update each team row explicitly to avoid insert paths that require season_id
      const results = await Promise.all(
        teams.map((t) =>
          supabase
            .from("teams")
            .update({ points_value: draft[t.id] })
            .eq("id", t.id)
        )
      );
      const firstError = results.find((r) => (r as any).error)?.error as any;
      if (firstError) throw firstError;
      setSaved(true);
    } catch (e: any) {
      console.error(e);
      setError("Failed to save team values");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Default Team Point Values</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Update the default points for each NFL team. These values are used across leagues unless overridden by league-specific settings.
        </p>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border">
              <img
                src={t.logo || "/placeholder-logo.svg"}
                alt={t.display_name}
                className="w-10 h-10 object-contain"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{t.display_name}</div>
                <div className="text-xs text-muted-foreground">{t.nfl_team_code}</div>
              </div>
              <Input
                type="number"
                min={1}
                max={32}
                className="w-20"
                value={draft[t.id] ?? 1}
                onChange={(e) => handleChange(t.id, Number(e.target.value) || 1)}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
          {saved && <span className="text-green-600 text-sm">Saved</span>}
        </div>
      </CardContent>
    </Card>
  );
}
