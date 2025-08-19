"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Trophy, Users, Target } from "lucide-react"

interface RecentActivityProps {
  userId: string
}

interface ActivityItem {
  id: string
  type: "score" | "pick" | "league_join" | "league_create"
  title: string
  description: string
  timestamp: string
  points?: number
}

export function RecentActivity({ userId }: RecentActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRecentActivity() {
      try {
        // This would normally fetch from multiple tables and combine
        // For now, using mock data to demonstrate the UI
        const mockActivities: ActivityItem[] = [
          {
            id: "1",
            type: "score",
            title: "Week 1 Results",
            description: "Earned 24 points in NFL Masters League",
            timestamp: "2024-09-10T20:00:00Z",
            points: 24,
          },
          {
            id: "2",
            type: "pick",
            title: "Week 2 Picks",
            description: "Selected Chiefs and Bills for Week 2",
            timestamp: "2024-09-09T15:30:00Z",
          },
          {
            id: "3",
            type: "league_join",
            title: "Joined League",
            description: "Joined 'Office Championship' league",
            timestamp: "2024-09-08T10:15:00Z",
          },
          {
            id: "4",
            type: "score",
            title: "Week 1 Results",
            description: "Earned 18 points in Office Championship",
            timestamp: "2024-09-07T21:00:00Z",
            points: 18,
          },
        ]

        setActivities(mockActivities)
      } catch (error) {
        console.error("Error fetching recent activity:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecentActivity()
  }, [userId])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "score":
        return Trophy
      case "pick":
        return Target
      case "league_join":
      case "league_create":
        return Users
      default:
        return Activity
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case "score":
        return "text-primary"
      case "pick":
        return "text-accent"
      case "league_join":
      case "league_create":
        return "text-secondary"
      default:
        return "text-muted-foreground"
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 48) return "Yesterday"
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-card/80 border-border/50">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center space-x-3">
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
    )
  }

  return (
    <Card className="backdrop-blur-sm bg-card/80 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Activity className="h-5 w-5 mr-2 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-6">
            <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.type)
              const iconColor = getActivityColor(activity.type)

              return (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full bg-muted/50 ${iconColor}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{activity.title}</p>
                      {activity.points && (
                        <Badge variant="outline" className="text-xs">
                          +{activity.points} pts
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatTimestamp(activity.timestamp)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
