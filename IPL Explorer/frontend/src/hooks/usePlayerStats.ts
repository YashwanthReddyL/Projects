import { useQuery } from 'react-query'
import { api } from '../api/client'

export const usePlayerSearch = (q: string) =>
  useQuery(['player-search', q], () => api.searchPlayers(q),
    { enabled: q.length >= 2, staleTime: Infinity })

export const usePlayerStats = (name: string | null, season?: string) =>
  useQuery(['player-stats', name, season], () => api.getPlayerStats(name!, season),
    { enabled: !!name, staleTime: 5 * 60 * 1000 })
