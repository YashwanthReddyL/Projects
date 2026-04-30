"""
schemas.py
==========
All Pydantic request/response models for the API.
Every router imports from here — no inline dicts.
Chat/chatbot models removed — feature dropped.
"""

from pydantic import BaseModel
from typing import Optional


# ── Match ─────────────────────────────────────────────────────────────────────

class Match(BaseModel):
    match_id: str
    date: str
    season: str
    city: str
    venue: str
    team1: str
    team2: str
    toss_winner: str
    toss_decision: str
    winner: str
    win_by_runs: int
    win_by_wickets: int
    result: str
    player_of_match: str
    umpire1: str
    umpire2: str


# ── Delivery ──────────────────────────────────────────────────────────────────

class Delivery(BaseModel):
    match_id: str
    date: str
    season: str
    innings: int
    is_super_over: int
    batting_team: str
    bowling_team: str
    over: int
    ball: int
    batsman: str
    non_striker: str
    bowler: str
    runs_batsman: int
    runs_extras: int
    runs_total: int
    extras_wides: int
    extras_noballs: int
    extras_legbyes: int
    extras_byes: int
    extras_penalty: int
    is_wicket: int
    wicket_kind: str
    player_dismissed: str
    fielder1: str
    fielder2: str


# ── Player stats ──────────────────────────────────────────────────────────────

class BattingStats(BaseModel):
    player: str
    matches: int
    innings: int
    runs: int
    balls_faced: int
    strike_rate: float
    average: float          # -1.0 means "not out every innings" (display as N/A)
    fours: int
    sixes: int
    fifties: int
    hundreds: int
    highest_score: int
    not_outs: int
    duck_outs: int


class BowlingStats(BaseModel):
    player: str
    matches: int
    innings: int
    overs: float
    balls_bowled: int
    runs_conceded: int      # bat runs + wides + no-balls charged to bowler
    wickets: int
    economy: float
    average: float          # -1.0 means no wickets taken
    best_figures: str
    dot_balls: int
    wides: int
    no_balls: int


class SeasonBattingLine(BaseModel):
    season: str
    matches: int
    innings: int
    runs: int
    average: float
    strike_rate: float
    fifties: int
    hundreds: int


class SeasonBowlingLine(BaseModel):
    season: str
    matches: int
    innings: int
    wickets: int
    economy: float
    average: float
    best_figures: str


class FieldingStats(BaseModel):
    catches: int
    run_outs: int          # times directly involved in a run-out (fielder1 or fielder2)
    stumpings: int
    total: int             # catches + run_outs + stumpings


class PlayerStats(BaseModel):
    player: str
    batting: BattingStats
    bowling: BowlingStats
    fielding: FieldingStats
    matches_played: int       # matches where player had any involvement in deliveries
    matches_in_squad: int     # matches listed in player_index (includes DNB)
    matches_batted: int       # matches where player faced at least one ball
    matches_bowled: int       # matches where player bowled at least one ball
    dnb_count: int            # matches in squad but did not bat (Did Not Bat)
    player_of_match_count: int
    season_batting: list[SeasonBattingLine]
    season_bowling: list[SeasonBowlingLine]


# ── Leaderboard ───────────────────────────────────────────────────────────────

class LeaderboardEntry(BaseModel):
    rank: int
    player: str
    value: float
    matches: int
    secondary: str          # e.g. "45 inns" or "120 wkts"


# ── Head-to-head ──────────────────────────────────────────────────────────────

class HeadToHeadStats(BaseModel):
    batsman: str
    bowler: str
    balls: int
    runs: int
    dismissals: int
    strike_rate: float
    dot_ball_pct: float


class TeamHeadToHead(BaseModel):
    team1: str
    team2: str
    matches: int
    team1_wins: int
    team2_wins: int
    no_result: int
    last_5: list[str]       # e.g. ["CSK", "MI", "CSK", "MI", "CSK"]


# ── Partnership ───────────────────────────────────────────────────────────────

class PartnershipRecord(BaseModel):
    batsman1: str
    batsman2: str
    runs: int
    balls: int
    match_id: str
    date: str
    for_team: str
    wicket: int             # which wicket stand this was


# ── Venue stats ───────────────────────────────────────────────────────────────

class VenueStats(BaseModel):
    venue: str
    city: str
    matches: int
    avg_first_innings_score: float
    avg_second_innings_score: float
    bat_first_wins: int
    field_first_wins: int
    highest_total: int
    lowest_total: int


# ── Phase split (powerplay / middle / death) ──────────────────────────────────

class PhaseSplit(BaseModel):
    phase: str              # "powerplay" | "middle" | "death"
    overs: str              # "1-6" | "7-15" | "16-20"
    runs: int
    wickets: int
    balls: int
    run_rate: float


# ── Over summary (dashboard chart) ───────────────────────────────────────────

class OverSummary(BaseModel):
    over: int
    runs: int
    wickets: int
    extras: int
    cumulative_runs: int


# ── Match scorecard ───────────────────────────────────────────────────────────

class BatsmanLine(BaseModel):
    batsman: str
    runs: int
    balls: int
    fours: int
    sixes: int
    strike_rate: float
    dismissal: str
    innings: int


class BowlerLine(BaseModel):
    bowler: str
    overs: float
    runs: int
    wickets: int
    economy: float
    wides: int
    no_balls: int
    innings: int


class SuperOverInnings(BaseModel):
    innings: int
    team: str
    total: int
    wickets: int
    batting: list[BatsmanLine]
    bowling: list[BowlerLine]


class Scorecard(BaseModel):
    match_id: str
    match: Match
    innings1_batting: list[BatsmanLine]
    innings1_bowling: list[BowlerLine]
    innings1_total: int
    innings1_wickets: int
    innings2_batting: list[BatsmanLine]
    innings2_bowling: list[BowlerLine]
    innings2_total: int
    innings2_wickets: int
    super_overs: list[SuperOverInnings]
    over_by_over: list[OverSummary]
    phase_splits: list[PhaseSplit]      # powerplay/middle/death for both innings
