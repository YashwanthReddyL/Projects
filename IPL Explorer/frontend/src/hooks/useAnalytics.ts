import { useQuery } from 'react-query'
import { api } from '../api/client'

export const useLeaderboard = (metric: string, season?: string, minInnings = 10) =>
  useQuery(['leaderboard', metric, season, minInnings],
    () => api.getLeaderboard(metric, season, minInnings),
    { staleTime: 5 * 60 * 1000 })

export const useH2HPlayers = (batsman: string | null, bowler: string | null) =>
  useQuery(['h2h-players', batsman, bowler],
    () => api.getH2HPlayers(batsman!, bowler!),
    { enabled: !!batsman && !!bowler, staleTime: 5 * 60 * 1000 })

export const useH2HTeams = (team1: string | null, team2: string | null) =>
  useQuery(['h2h-teams', team1, team2],
    () => api.getH2HTeams(team1!, team2!),
    { enabled: !!team1 && !!team2 && team1 !== team2, staleTime: 5 * 60 * 1000 })

export const useAllVenueStats = (season?: string) =>
  useQuery(['venue-stats', season],
    () => api.getAllVenueStats(season),
    { staleTime: 5 * 60 * 1000 })


// Win probability hooks
import { WinProbResult, WinTimeline, ModelInfo } from '../api/client'

export const useWinTimeline = (matchId: string | null) =>
  useQuery(
    ['win-timeline', matchId],
    () => (api as any).getWinTimeline(matchId!),
    { enabled: !!matchId, staleTime: Infinity }
  )

export const useModelInfo = () =>
  useQuery(
    ['model-info'],
    () => (api as any).getModelInfo(),
    { staleTime: Infinity }
  )
