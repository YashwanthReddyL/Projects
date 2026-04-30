"""
routers/matches.py
==================
GET /matches            — list matches, sorted by date desc, no 50-row cap per season
GET /matches/{id}       — single match
GET /matches/{id}/scorecard
GET /matches/meta/seasons|teams|venues
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from services.data_loader import get_store
from services.stats_engine import build_scorecard
from models.schemas import Match, Scorecard

router = APIRouter(prefix="/matches", tags=["matches"])


@router.get("", response_model=list[Match])
def list_matches(
    season: Optional[str] = Query(None),
    team:   Optional[str] = Query(None),
    venue:  Optional[str] = Query(None),
    limit:  int           = Query(500, le=1000),   # raised: a full season is ~70 matches
    offset: int           = Query(0),
):
    store = get_store()
    df    = store.matches.copy()

    if season:
        df = df[df["season"] == season]
    if team:
        df = df[(df["team1"] == team) | (df["team2"] == team)]
    if venue:
        df = df[df["venue"].str.contains(venue, case=False, na=False)]

    # Always sort newest first so the dropdown shows recent matches at the top
    df = df.sort_values("date", ascending=False)
    df = df.iloc[offset: offset + limit]
    return df.fillna("").to_dict(orient="records")


@router.get("/{match_id}", response_model=Match)
def get_match(match_id: str):
    store = get_store()
    row   = store.matches[store.matches["match_id"] == match_id]
    if row.empty:
        raise HTTPException(status_code=404, detail=f"Match {match_id} not found")
    return row.fillna("").iloc[0].to_dict()


@router.get("/{match_id}/scorecard", response_model=Scorecard)
def get_scorecard(match_id: str):
    store = get_store()
    try:
        return build_scorecard(match_id, store.deliveries, store.matches)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/meta/seasons")
def list_seasons():
    store = get_store()
    # Return sorted descending so newest appears first in UI
    return sorted(store.season_index.keys(), reverse=True)


@router.get("/meta/teams")
def list_teams():
    store   = get_store()
    return sorted(store.team_index.keys())


@router.get("/meta/venues")
def list_venues():
    store  = get_store()
    venues = store.matches["venue"].dropna().unique().tolist()
    return sorted(venues)
