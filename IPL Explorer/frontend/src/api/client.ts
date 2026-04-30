/**
 * client.ts
 * =========
 * Single choke point for all API calls.
 * No component ever calls fetch() directly.
 * Chat/chatbot removed.
 */

const BASE = '/api'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? `HTTP ${res.status}`)
  }
  return res.json()
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Match {
  match_id: string; date: string; season: string
  city: string; venue: string; team1: string; team2: string
  toss_winner: string; toss_decision: string; winner: string
  win_by_runs: number; win_by_wickets: number; result: string
  player_of_match: string; umpire1: string; umpire2: string
}

export interface OverSummary {
  over: number; runs: number; wickets: number
  extras: number; cumulative_runs: number
}

export interface BatsmanLine {
  batsman: string; runs: number; balls: number; fours: number
  sixes: number; strike_rate: number; dismissal: string; innings: number
}

export interface BowlerLine {
  bowler: string; overs: number; runs: number; wickets: number
  economy: number; wides: number; no_balls: number; innings: number
}

export interface SuperOverInnings {
  innings: number; team: string; total: number; wickets: number
  batting: BatsmanLine[]; bowling: BowlerLine[]
}

export interface PhaseSplit {
  phase: string; overs: string
  runs: number; wickets: number; balls: number; run_rate: number
}

export interface Scorecard {
  match_id: string; match: Match
  innings1_batting: BatsmanLine[]; innings1_bowling: BowlerLine[]
  innings1_total: number; innings1_wickets: number
  innings2_batting: BatsmanLine[]; innings2_bowling: BowlerLine[]
  innings2_total: number; innings2_wickets: number
  super_overs: SuperOverInnings[]
  over_by_over: OverSummary[]
  phase_splits: PhaseSplit[]
}

export interface BattingStats {
  player: string; matches: number; innings: number; runs: number
  balls_faced: number; strike_rate: number
  average: number   // -1 means never dismissed (render as "∞")
  fours: number; sixes: number; fifties: number; hundreds: number
  highest_score: number; not_outs: number; duck_outs: number
}

export interface BowlingStats {
  player: string; matches: number; innings: number; overs: number
  balls_bowled: number; runs_conceded: number; wickets: number
  economy: number
  average: number   // -1 means no wickets
  best_figures: string; dot_balls: number; wides: number; no_balls: number
}

export interface SeasonBattingLine {
  season: string; matches: number; innings: number; runs: number
  average: number; strike_rate: number; fifties: number; hundreds: number
}

export interface SeasonBowlingLine {
  season: string; matches: number; innings: number; wickets: number
  economy: number; average: number; best_figures: string
}

export interface FieldingStats {
  catches: number
  run_outs: number
  stumpings: number
  total: number
}

export interface PlayerStats {
  player: string
  batting: BattingStats
  bowling: BowlingStats
  fielding: FieldingStats
  matches_played: number      // matches with any delivery involvement
  matches_in_squad: number    // matches listed in player_index (includes DNB)
  matches_batted: number
  matches_bowled: number
  dnb_count: number           // Did Not Bat — in squad but never faced a ball
  player_of_match_count: number
  season_batting: SeasonBattingLine[]
  season_bowling: SeasonBowlingLine[]
}

export interface LeaderboardEntry {
  rank: number; player: string; value: number
  matches: number; secondary: string
}

export interface HeadToHeadStats {
  batsman: string; bowler: string; balls: number; runs: number
  dismissals: number; strike_rate: number; dot_ball_pct: number
}

export interface TeamHeadToHead {
  team1: string; team2: string; matches: number
  team1_wins: number; team2_wins: number; no_result: number
  last_5: string[]
}

export interface PartnershipRecord {
  batsman1: string; batsman2: string; runs: number; balls: number
  match_id: string; date: string; for_team: string; wicket: number
}

export interface VenueStats {
  venue: string; city: string; matches: number
  avg_first_innings_score: number; avg_second_innings_score: number
  bat_first_wins: number; field_first_wins: number
  highest_total: number; lowest_total: number
}

// ── Helper ────────────────────────────────────────────────────────────────────

export function fmtAvg(avg: number): string {
  return avg < 0 ? '∞' : avg.toFixed(2)
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const api = {
  // Matches
  getMatches: (p?: { season?: string; team?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams()
    if (p?.season) qs.set('season', p.season)
    if (p?.team)   qs.set('team',   p.team)
    if (p?.limit)  qs.set('limit',  String(p.limit))
    if (p?.offset) qs.set('offset', String(p.offset))
    return get<Match[]>(`/matches?${qs}`)
  },
  getMatch:     (id: string)  => get<Match>(`/matches/${id}`),
  getScorecard: (id: string)  => get<Scorecard>(`/matches/${id}/scorecard`),
  getSeasons:   ()            => get<string[]>('/matches/meta/seasons'),
  getTeams:     ()            => get<string[]>('/matches/meta/teams'),
  getVenueList: ()            => get<string[]>('/matches/meta/venues'),

  // Deliveries
  getOverSummary: (matchId: string, innings?: number) => {
    const qs = new URLSearchParams({ match_id: matchId })
    if (innings) qs.set('innings', String(innings))
    return get<OverSummary[]>(`/deliveries/overs?${qs}`)
  },

  // Players
  searchPlayers: (q: string) =>
    get<string[]>(`/players/search?q=${encodeURIComponent(q)}`),
  getPlayerStats: (name: string, season?: string) => {
    const qs = season ? `?season=${season}` : ''
    return get<PlayerStats>(`/players/${encodeURIComponent(name)}/stats${qs}`)
  },

  // Analytics
  getLeaderboard: (metric: string, season?: string, minInnings = 10, topN = 20) => {
    const qs = new URLSearchParams({ metric, min_innings: String(minInnings), top_n: String(topN) })
    if (season) qs.set('season', season)
    return get<LeaderboardEntry[]>(`/analytics/leaderboard?${qs}`)
  },
  getH2HPlayers: (batsman: string, bowler: string) =>
    get<HeadToHeadStats>(`/analytics/h2h/players?batsman=${encodeURIComponent(batsman)}&bowler=${encodeURIComponent(bowler)}`),
  getH2HTeams: (team1: string, team2: string) =>
    get<TeamHeadToHead>(`/analytics/h2h/teams?team1=${encodeURIComponent(team1)}&team2=${encodeURIComponent(team2)}`),
  getVenueStats: (venue: string) =>
    get<VenueStats>(`/analytics/venues/${encodeURIComponent(venue)}`),
  getAllVenueStats: (season?: string) => {
    const qs = season ? `?season=${season}` : ''
    return get<VenueStats[]>(`/analytics/venues${qs}`)
  },
  getPartnerships: (matchId: string, innings = 1) =>
    get<PartnershipRecord[]>(`/analytics/partnerships?match_id=${matchId}&innings=${innings}`),
}


// ── Win Probability ───────────────────────────────────────────────────────────

export interface WinProbResult {
  batting_win_prob: number
  bowling_win_prob: number
  context: {
    innings: number; over: number; ball: number
    runs_so_far: number; wickets_so_far: number; balls_remaining: number
    crr: number; rrr?: number; runs_required?: number; target?: number
  }
  model_trained_on: number
}

export interface WinTimelinePoint {
  innings: number; over: number; label: string
  batting_team: string; bowling_team: string
  runs_so_far: number; wickets_so_far: number
  batting_win_prob: number; bowling_win_prob: number
  crr: number; rrr?: number; runs_required?: number
}

export interface WinTimeline {
  match_id: string; team1: string; team2: string
  winner: string; inn1_total: number; target: number
  timeline: WinTimelinePoint[]
}

export interface ModelInfo {
  available: boolean; n_training_samples?: number
  features?: string[]
  feature_importance?: Record<string, number>
  model_type?: string; note?: string; message?: string
}

// Append to api object — re-export a patched version via augmentation
Object.assign(api, {
  predictWin: (p: {
    innings: number; over: number; ball: number
    runs_so_far: number; wickets_so_far: number; target?: number
  }) => {
    const qs = new URLSearchParams({
      innings:        String(p.innings),
      over:           String(p.over),
      ball:           String(p.ball),
      runs_so_far:    String(p.runs_so_far),
      wickets_so_far: String(p.wickets_so_far),
      target:         String(p.target ?? 0),
    })
    return get<WinProbResult>(`/predict/win?${qs}`)
  },
  getWinTimeline: (matchId: string) => get<WinTimeline>(`/predict/match/${matchId}`),
  getModelInfo:   ()                => get<ModelInfo>('/predict/model/info'),
})
