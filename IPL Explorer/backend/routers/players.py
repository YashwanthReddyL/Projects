"""
routers/players.py
==================
GET /players/search         — fuzzy search by name tokens
GET /players/{name}/stats   — full career + season breakdown stats
GET /players/{name}/batting
GET /players/{name}/bowling
"""

import re
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from services.data_loader import get_store
from services.stats_engine import calc_player_stats, calc_batting_stats, calc_bowling_stats
from models.schemas import PlayerStats, BattingStats, BowlingStats

router = APIRouter(prefix="/players", tags=["players"])


def _name_tokens(name: str) -> set[str]:
    """
    Tokenise a player name for fuzzy matching.
    "V Kohli" -> {"v", "kohli"}
    "Virat Kohli" -> {"virat", "kohli"}
    Also expand common initials: "V" could match "Virat".
    """
    return set(re.split(r"[\s.]+", name.lower()))


def _fuzzy_match(query: str, player_name: str) -> bool:
    """
    Return True if the query matches the player name.
    Rules (in order):
      1. Exact substring (original behaviour) — "kohli" matches "V Kohli"
      2. All query tokens are substrings of the player name tokens
         — "virat kohli" matches "V Kohli" because:
           "virat" starts with initial "v", "kohli" == "kohli"
    """
    q_lower  = query.lower().strip()
    n_lower  = player_name.lower()

    # Rule 1: direct substring
    if q_lower in n_lower:
        return True

    # Rule 2: token matching
    q_tokens = _name_tokens(q_lower)
    n_tokens = _name_tokens(player_name)

    for qt in q_tokens:
        matched = False
        for nt in n_tokens:
            # exact token match OR query token is start of a name token (initial expansion)
            if qt == nt or nt.startswith(qt):
                matched = True
                break
        if not matched:
            return False
    return True


@router.get("/search")
def search_players(q: str = Query(..., min_length=2)):
    """Return up to 20 player names matching the query (fuzzy, token-aware)."""
    store = get_store()
    results = [
        name for name in store.player_index
        if _fuzzy_match(q, name)
    ]
    # Sort: exact substring matches first, then alphabetical
    q_lower = q.lower()
    results.sort(key=lambda n: (0 if q_lower in n.lower() else 1, n))
    return results[:20]


@router.get("/{player_name}/stats", response_model=PlayerStats)
def get_player_stats(
    player_name: str,
    season: Optional[str] = Query(None),
):
    store = get_store()
    if player_name not in store.player_index:
        raise HTTPException(status_code=404, detail=f"Player '{player_name}' not found")

    match_ids = None
    if season:
        season_data = store.season_index.get(season)
        if not season_data:
            raise HTTPException(status_code=404, detail=f"Season {season} not found")
        match_ids = season_data["match_ids"]

    return calc_player_stats(player_name, store.deliveries, store.matches, match_ids, store.player_index)


@router.get("/{player_name}/batting", response_model=BattingStats)
def get_batting_stats(
    player_name: str,
    season: Optional[str] = Query(None),
):
    store = get_store()
    if player_name not in store.player_index:
        raise HTTPException(status_code=404, detail=f"Player '{player_name}' not found")

    match_ids = None
    if season:
        sd = store.season_index.get(season)
        if sd:
            match_ids = sd["match_ids"]

    return calc_batting_stats(player_name, store.deliveries, store.matches, match_ids)


@router.get("/{player_name}/bowling", response_model=BowlingStats)
def get_bowling_stats(
    player_name: str,
    season: Optional[str] = Query(None),
):
    store = get_store()
    if player_name not in store.player_index:
        raise HTTPException(status_code=404, detail=f"Player '{player_name}' not found")

    match_ids = None
    if season:
        sd = store.season_index.get(season)
        if sd:
            match_ids = sd["match_ids"]

    return calc_bowling_stats(player_name, store.deliveries, match_ids)
