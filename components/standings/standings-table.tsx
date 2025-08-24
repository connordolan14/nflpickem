"use client"

import type React from "react"
import { Fragment } from "react"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronUp, ArrowUpDown } from "lucide-react"
import { WeeklyBreakdown } from "./weekly-breakdown"

interface StandingData {
  user_id: string
  display_name: string
  total_points: number
  wins: number
  losses: number
  byes_used: number
  rank: number
}

interface StandingsTableProps {
  standings: StandingData[]
  currentUserId: string
  leagueId: string
}

type SortField = "rank" | "display_name" | "total_points" | "wins" | "losses" | "byes_used"
type SortDirection = "asc" | "desc"

export function StandingsTable({ standings, currentUserId, leagueId }: StandingsTableProps) {
  const [sortField, setSortField] = useState<SortField>("rank")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection(field === "rank" ? "asc" : "desc")
    }
  }

  const toggleRowExpansion = (userId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId)
    } else {
      newExpanded.add(userId)
    }
    setExpandedRows(newExpanded)
  }

  const sortedStandings = [...standings].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    }

    return sortDirection === "asc" ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number)
  })

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="h-auto p-0 font-semibold hover:bg-transparent"
    >
      {children}
      {sortField === field ? (
        sortDirection === "asc" ? (
          <ChevronUp className="ml-1 h-3 w-3" />
        ) : (
          <ChevronDown className="ml-1 h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
      )}
    </Button>
  )

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20">
              <TableHead className="w-12"></TableHead>
              <TableHead>
                <SortButton field="rank">Rank</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="display_name">Player</SortButton>
              </TableHead>
              <TableHead className="text-right">
                <SortButton field="total_points">Points</SortButton>
              </TableHead>
              <TableHead className="text-center">
                <SortButton field="wins">W</SortButton>
              </TableHead>
              <TableHead className="text-center">
                <SortButton field="losses">L</SortButton>
              </TableHead>
              <TableHead className="text-center">
                <SortButton field="byes_used">Byes</SortButton>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStandings.map((standing) => {
              const isCurrentUser = standing.user_id === currentUserId
              const isExpanded = expandedRows.has(standing.user_id)

              return (
                <Fragment key={standing.user_id}>
                  <TableRow
                    className={`
                      ${isCurrentUser ? "bg-primary/10 border-primary/20" : "hover:bg-muted/20"}
                      transition-colors cursor-pointer
                    `}
                    onClick={() => toggleRowExpansion(standing.user_id)}
                  >
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {standing.rank <= 3 && (
                          <span className="mr-2">{standing.rank === 1 ? "🥇" : standing.rank === 2 ? "🥈" : "🥉"}</span>
                        )}
                        <span className="font-semibold">#{standing.rank}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className={isCurrentUser ? "font-semibold text-primary" : ""}>
                          {standing.display_name}
                        </span>
                        {isCurrentUser && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            You
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{standing.total_points}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {standing.wins}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        {standing.losses}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-muted-foreground">{standing.byes_used}/4</span>
                    </TableCell>
                  </TableRow>

                  {isExpanded && (
                    <TableRow key={`${standing.user_id}-details`}>
                      <TableCell colSpan={7} className="p-0">
                        <WeeklyBreakdown userId={standing.user_id} leagueId={leagueId} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
