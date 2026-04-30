import { useQuery } from 'react-query'
import { api } from '../api/client'

export const useSeasons = () =>
  useQuery(['seasons'], () => api.getSeasons(), { staleTime: Infinity })

export const useTeams = () =>
  useQuery(['teams'], () => api.getTeams(), { staleTime: Infinity })

export const useMatches = (params?: {
  season?: string; team?: string; limit?: number; offset?: number
}) =>
  useQuery(
    ['matches', params],
    () => api.getMatches(params),
    { enabled: true, staleTime: 5 * 60 * 1000 }
  )

export const useMatch = (matchId: string | null) =>
  useQuery(['match', matchId], () => api.getMatch(matchId!),
    { enabled: !!matchId, staleTime: Infinity })

export const useScorecard = (matchId: string | null) =>
  useQuery(['scorecard', matchId], () => api.getScorecard(matchId!),
    { enabled: !!matchId, staleTime: Infinity })

export const useOverSummary = (matchId: string | null, innings?: number) =>
  useQuery(['overs', matchId, innings], () => api.getOverSummary(matchId!, innings),
    { enabled: !!matchId, staleTime: Infinity })

export const usePartnerships = (matchId: string | null, innings = 1) =>
  useQuery(['partnerships', matchId, innings], () => api.getPartnerships(matchId!, innings),
    { enabled: !!matchId, staleTime: Infinity })
