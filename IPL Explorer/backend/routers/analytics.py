"""
routers/analytics.py
====================
GET /analytics/leaderboard      — top N players by metric
GET /analytics/h2h/players      — batsman vs bowler head-to-head
GET /analytics/h2h/teams        — team vs team record
GET /analytics/venues           — list all venue stats
GET /analytics/venues/{venue}   — single venue stats
GET /analytics/partnerships     — top partnerships for a match innings
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from services.data_loader import get_store
from services.stats_engine import (
    calc_leaderboard, calc_h2h_player, calc_h2h_team,
    calc_partnerships, calc_venue_stats,
)
from models.schemas import (
    LeaderboardEntry, HeadToHeadStats, TeamHeadToHead,
    PartnershipRecord, VenueStats,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])

VALID_METRICS = {"runs", "wickets", "strike_rate", "average", "economy", "sixes"}


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
def leaderboard(
    metric:      str           = Query("runs", description=f"One of: {VALID_METRICS}"),
    season:      Optional[str] = Query(None),
    min_innings: int           = Query(10, ge=1, le=50),
    top_n:       int           = Query(20, ge=5, le=50),
):
    if metric not in VALID_METRICS:
        raise HTTPException(status_code=422, detail=f"metric must be one of {VALID_METRICS}")
    store = get_store()
    return calc_leaderboard(metric, store.deliveries, store.matches, season, min_innings, top_n)


@router.get("/h2h/players", response_model=HeadToHeadStats)
def h2h_players(
    batsman: str = Query(...),
    bowler:  str = Query(...),
):
    store = get_store()
    return calc_h2h_player(batsman, bowler, store.deliveries)


@router.get("/h2h/teams", response_model=TeamHeadToHead)
def h2h_teams(
    team1: str = Query(...),
    team2: str = Query(...),
):
    store = get_store()
    return calc_h2h_team(team1, team2, store.matches)


@router.get("/venues", response_model=list[VenueStats])
def list_venue_stats(season: Optional[str] = Query(None)):
    store   = get_store()
    matches = store.matches
    if season:
        matches = matches[matches["season"] == season]
    venues  = matches["venue"].dropna().unique().tolist()
    return [calc_venue_stats(v, store.deliveries, store.matches) for v in sorted(venues)]


@router.get("/venues/{venue_name}", response_model=VenueStats)
def get_venue_stats(venue_name: str):
    store = get_store()
    # Allow partial match on venue name
    all_venues = store.matches["venue"].dropna().unique().tolist()
    matched    = [v for v in all_venues if venue_name.lower() in v.lower()]
    if not matched:
        raise HTTPException(status_code=404, detail=f"Venue '{venue_name}' not found")
    return calc_venue_stats(matched[0], store.deliveries, store.matches)


@router.get("/partnerships", response_model=list[PartnershipRecord])
def get_partnerships(
    match_id: str = Query(...),
    innings:  int = Query(1, ge=1, le=2),
):
    store = get_store()
    if store.matches[store.matches["match_id"] == match_id].empty:
        raise HTTPException(status_code=404, detail=f"Match {match_id} not found")
    return calc_partnerships(match_id, store.deliveries, innings)
