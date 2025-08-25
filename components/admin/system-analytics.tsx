"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  Clock,
  Target,
  BarChart3,
  Calendar,
} from "lucide-react";

export function SystemAnalytics() {
  const metrics = {
    userGrowth: {
      current: 1247,
      previous: 1012,
      change: "+23.2%",
      trend: "up",
    },
    leagueActivity: {
      current: 156,
      previous: 134,
      change: "+16.4%",
      trend: "up",
    },
    pickAccuracy: {
      current: 68.5,
      previous: 65.2,
      change: "+3.3%",
      trend: "up",
    },
    revenue: {
      current: 12450,
      previous: 9875,
      change: "+26.1%",
      trend: "up",
    },
  };

  const weeklyStats = [
    { week: "Week 1", users: 1247, picks: 15420, accuracy: 68.5 },
    { week: "Week 2", users: 1189, picks: 14268, accuracy: 67.2 },
    { week: "Week 3", users: 1156, picks: 13872, accuracy: 69.1 },
    { week: "Week 4", users: 1123, picks: 13476, accuracy: 66.8 },
    { week: "Week 5", users: 1098, picks: 13176, accuracy: 70.3 },
  ];

  const getTrendIcon = (trend: string) => {
    return trend === "up" ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  const getTrendColor = (trend: string) => {
    return trend === "up" ? "text-green-600" : "text-red-600";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">System Analytics</h2>
        <p className="text-muted-foreground">
          Monitor application performance and user engagement
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Growth</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.userGrowth.current.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-sm">
              {getTrendIcon(metrics.userGrowth.trend)}
              <span className={getTrendColor(metrics.userGrowth.trend)}>
                {metrics.userGrowth.change}
              </span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              League Activity
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.leagueActivity.current}
            </div>
            <div className="flex items-center gap-1 text-sm">
              {getTrendIcon(metrics.leagueActivity.trend)}
              <span className={getTrendColor(metrics.leagueActivity.trend)}>
                {metrics.leagueActivity.change}
              </span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pick Accuracy</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.pickAccuracy.current}%
            </div>
            <div className="flex items-center gap-1 text-sm">
              {getTrendIcon(metrics.pickAccuracy.trend)}
              <span className={getTrendColor(metrics.pickAccuracy.trend)}>
                {metrics.pickAccuracy.change}
              </span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics.revenue.current.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-sm">
              {getTrendIcon(metrics.revenue.trend)}
              <span className={getTrendColor(metrics.revenue.trend)}>
                {metrics.revenue.change}
              </span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Weekly Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {weeklyStats.map((stat, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">{stat.week}</h4>
                    <p className="text-sm text-muted-foreground">
                      {stat.users} active users
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-right">
                  <div>
                    <div className="font-medium">
                      {stat.picks.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total Picks
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">{stat.accuracy}%</div>
                    <div className="text-xs text-muted-foreground">
                      Accuracy
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Average Response Time</span>
              <Badge variant="default">245ms</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Uptime</span>
              <Badge variant="default">99.9%</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Error Rate</span>
              <Badge variant="secondary">0.1%</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Active Sessions</span>
              <Badge variant="secondary">156</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Engagement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Daily Active Users</span>
              <Badge variant="default">892</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Weekly Active Users</span>
              <Badge variant="default">1,156</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Monthly Active Users</span>
              <Badge variant="default">1,247</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Session Duration</span>
              <Badge variant="secondary">18m 32s</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
