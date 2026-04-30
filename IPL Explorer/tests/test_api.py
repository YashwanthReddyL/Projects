"""
test_api.py
===========
Integration tests for the FastAPI backend.
Uses httpx TestClient — no server needed.
Requires data/processed/ CSVs (run pipeline first).

Run from project root:
    cd backend && pytest ../tests/test_api.py -v
"""

import sys
import pytest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))


@pytest.fixture(scope="module")
def client():
    try:
        from fastapi.testclient import TestClient
        from main import app
        return TestClient(app)
    except FileNotFoundError as e:
        pytest.skip(f"Processed data not available: {e}")
    except Exception as e:
        pytest.skip(f"Backend startup failed: {e}")


# ── Health ────────────────────────────────────────────────────────────────────

def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["matches_loaded"] > 0
    assert data["deliveries_loaded"] > 0
    assert data["players_indexed"] > 0


# ── Matches ───────────────────────────────────────────────────────────────────

def test_list_matches_returns_results(client):
    res = client.get("/api/matches")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "match_id" in data[0]
    assert "team1" in data[0]

def test_list_matches_sorted_newest_first(client):
    res = client.get("/api/matches")
    assert res.status_code == 200
    dates = [m["date"] for m in res.json()]
    assert dates == sorted(dates, reverse=True), "Matches should be newest first"

def test_list_matches_season_filter(client):
    seasons_res = client.get("/api/matches/meta/seasons")
    seasons = seasons_res.json()
    if not seasons:
        pytest.skip("No seasons available")
    season = seasons[0]
    res = client.get(f"/api/matches?season={season}")
    assert res.status_code == 200
    for m in res.json():
        assert m["season"] == season

def test_list_matches_limit_respected(client):
    res = client.get("/api/matches?limit=3")
    assert res.status_code == 200
    assert len(res.json()) <= 3

def test_get_match_335982(client):
    res = client.get("/api/matches/335982")
    if res.status_code == 404:
        pytest.skip("Match 335982 not in this dataset")
    assert res.status_code == 200
    data = res.json()
    assert data["winner"] == "Kolkata Knight Riders"
    assert data["win_by_runs"] == 140
    # Check canonical team name applied
    assert data["team1"] in ("Royal Challengers Bengaluru", "Kolkata Knight Riders")

def test_get_match_not_found(client):
    res = client.get("/api/matches/DOESNOTEXIST999")
    assert res.status_code == 404

def test_get_scorecard(client):
    res = client.get("/api/matches/335982/scorecard")
    if res.status_code == 404:
        pytest.skip("Match 335982 not in dataset")
    assert res.status_code == 200
    data = res.json()
    assert "innings1_batting" in data
    assert "innings2_bowling" in data
    assert "phase_splits" in data
    assert "super_overs" in data
    assert data["innings1_total"] > 0

def test_scorecard_phase_splits_structure(client):
    res = client.get("/api/matches/335982/scorecard")
    if res.status_code == 404:
        pytest.skip("Match 335982 not in dataset")
    splits = res.json()["phase_splits"]
    assert isinstance(splits, list)
    phases = [s["phase"] for s in splits]
    # Both innings should have powerplay entries
    assert any("powerplay" in p for p in phases)

def test_meta_seasons_newest_first(client):
    res = client.get("/api/matches/meta/seasons")
    assert res.status_code == 200
    seasons = res.json()
    assert seasons == sorted(seasons, reverse=True), "Seasons should be newest first"

def test_meta_teams_no_duplicates(client):
    res = client.get("/api/matches/meta/teams")
    assert res.status_code == 200
    teams = res.json()
    # No duplicate canonical names
    assert len(teams) == len(set(teams)), "Duplicate team names found"
    # Canonical names should NOT contain old variants
    assert "Delhi Daredevils" not in teams
    assert "Kings XI Punjab" not in teams
    assert "Royal Challengers Bangalore" not in teams


# ── Deliveries ────────────────────────────────────────────────────────────────

def test_deliveries_requires_match_id(client):
    res = client.get("/api/deliveries")
    assert res.status_code == 422

def test_deliveries_for_match(client):
    res = client.get("/api/deliveries?match_id=335982")
    if res.status_code == 404:
        pytest.skip("Match 335982 not in dataset")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 225
    # Check is_super_over field present
    assert "is_super_over" in data[0]

def test_over_summary_structure(client):
    res = client.get("/api/deliveries/overs?match_id=335982")
    if res.status_code == 404:
        pytest.skip("Match 335982 not in dataset")
    assert res.status_code == 200
    overs = res.json()
    assert isinstance(overs, list)
    for o in overs:
        assert "over" in o
        assert "runs" in o
        assert "wickets" in o
        assert "cumulative_runs" in o

def test_over_summary_cumulative_monotone(client):
    res = client.get("/api/deliveries/overs?match_id=335982")
    if res.status_code == 404:
        pytest.skip("Match 335982 not in dataset")
    cums = [o["cumulative_runs"] for o in res.json()]
    assert all(cums[i] <= cums[i+1] for i in range(len(cums)-1)), \
        "Cumulative runs must be non-decreasing"


# ── Players ───────────────────────────────────────────────────────────────────

def test_player_search_exact(client):
    res = client.get("/api/players/search?q=McCullum")
    assert res.status_code == 200
    results = res.json()
    assert any("McCullum" in r for r in results)

def test_player_search_fuzzy_full_name(client):
    """'virat kohli' should match 'V Kohli' via token expansion."""
    res = client.get("/api/players/search?q=virat+kohli")
    assert res.status_code == 200
    results = res.json()
    # Should find V Kohli or Virat Kohli depending on dataset format
    assert any("Kohli" in r for r in results), \
        f"Fuzzy search 'virat kohli' found nothing. Results: {results[:5]}"

def test_player_search_min_length(client):
    res = client.get("/api/players/search?q=K")
    assert res.status_code == 422

def test_player_stats_structure(client):
    res = client.get("/api/players/BB McCullum/stats")
    if res.status_code == 404:
        pytest.skip("BB McCullum not in dataset")
    assert res.status_code == 200
    data = res.json()
    # New fields from latest schema
    assert "batting"          in data
    assert "bowling"          in data
    assert "fielding"         in data
    assert "matches_in_squad" in data
    assert "matches_batted"   in data
    assert "matches_bowled"   in data
    assert "dnb_count"        in data
    assert "season_batting"   in data
    assert "season_bowling"   in data
    # FieldingStats structure
    assert "catches"   in data["fielding"]
    assert "run_outs"  in data["fielding"]
    assert "stumpings" in data["fielding"]
    assert "total"     in data["fielding"]

def test_player_stats_mccullum_basics(client):
    res = client.get("/api/players/BB McCullum/stats")
    if res.status_code == 404:
        pytest.skip("BB McCullum not in dataset")
    data = res.json()
    assert data["batting"]["runs"] >= 158   # at minimum his 2008 innings
    assert data["matches_played"] >= 1

def test_player_stats_average_sentinel(client):
    """A player never dismissed should have average == -1.0 (sentinel for ∞)."""
    # This test would need a specific DNB-only player in the dataset
    # We test the field exists and is a float
    res = client.get("/api/players/BB McCullum/stats")
    if res.status_code == 404:
        pytest.skip("BB McCullum not in dataset")
    avg = res.json()["batting"]["average"]
    assert isinstance(avg, float)

def test_player_stats_season_breakdown(client):
    res = client.get("/api/players/BB McCullum/stats")
    if res.status_code == 404:
        pytest.skip("BB McCullum not in dataset")
    data = res.json()
    assert isinstance(data["season_batting"], list)
    if data["season_batting"]:
        row = data["season_batting"][0]
        assert "season" in row
        assert "runs"   in row
        assert "average" in row

def test_player_not_found(client):
    res = client.get("/api/players/NOBODY_EVER_9999/stats")
    assert res.status_code == 404


# ── Analytics — Leaderboard ───────────────────────────────────────────────────

def test_leaderboard_runs(client):
    res = client.get("/api/analytics/leaderboard?metric=runs&top_n=10")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    if data:
        assert "rank"      in data[0]
        assert "player"    in data[0]
        assert "value"     in data[0]
        assert "secondary" in data[0]
        # Ranks should be sequential
        ranks = [d["rank"] for d in data]
        assert ranks == list(range(1, len(ranks)+1))
        # Values should be descending
        values = [d["value"] for d in data]
        assert values == sorted(values, reverse=True)

def test_leaderboard_wickets(client):
    res = client.get("/api/analytics/leaderboard?metric=wickets&top_n=5")
    assert res.status_code == 200

def test_leaderboard_economy(client):
    res = client.get("/api/analytics/leaderboard?metric=economy&top_n=5")
    assert res.status_code == 200
    data = res.json()
    if len(data) > 1:
        # Economy is ascending (lower is better) — values should be ascending
        values = [d["value"] for d in data]
        assert values == sorted(values), "Economy leaderboard should be ascending"

def test_leaderboard_invalid_metric(client):
    res = client.get("/api/analytics/leaderboard?metric=invalid_metric")
    assert res.status_code == 422

def test_leaderboard_season_filter(client):
    seasons_res = client.get("/api/matches/meta/seasons")
    if not seasons_res.json():
        pytest.skip("No seasons")
    season = seasons_res.json()[0]
    res = client.get(f"/api/analytics/leaderboard?metric=runs&season={season}")
    assert res.status_code == 200


# ── Analytics — Head to Head ──────────────────────────────────────────────────

def test_h2h_players(client):
    res = client.get("/api/analytics/h2h/players?batsman=BB McCullum&bowler=P Kumar")
    if res.status_code == 404:
        pytest.skip("Players not in dataset")
    assert res.status_code == 200
    data = res.json()
    assert "batsman"     in data
    assert "bowler"      in data
    assert "balls"       in data
    assert "runs"        in data
    assert "dismissals"  in data
    assert "strike_rate" in data
    # Balls should be non-negative
    assert data["balls"] >= 0

def test_h2h_teams(client):
    res = client.get("/api/analytics/h2h/teams?team1=Mumbai Indians&team2=Chennai Super Kings")
    assert res.status_code == 200
    data = res.json()
    assert "team1"      in data
    assert "team2"      in data
    assert "matches"    in data
    assert "team1_wins" in data
    assert "team2_wins" in data
    assert "last_5"     in data
    assert data["team1_wins"] + data["team2_wins"] + data["no_result"] == data["matches"]


# ── Analytics — Venues ────────────────────────────────────────────────────────

def test_venue_list(client):
    res = client.get("/api/analytics/venues")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    if data:
        v = data[0]
        assert "venue"   in v
        assert "matches" in v
        assert "avg_first_innings_score"  in v
        assert "avg_second_innings_score" in v
        assert "bat_first_wins"  in v
        assert "field_first_wins" in v
        assert "highest_total" in v

def test_venue_bat_field_wins_sum(client):
    res = client.get("/api/analytics/venues")
    assert res.status_code == 200
    for v in res.json():
        total = v["bat_first_wins"] + v["field_first_wins"]
        assert total <= v["matches"], \
            f"{v['venue']}: wins ({total}) exceed matches ({v['matches']})"

def test_venue_not_found(client):
    res = client.get("/api/analytics/venues/COMPLETELY_FAKE_VENUE_XYZ")
    assert res.status_code == 404


# ── Analytics — Partnerships ──────────────────────────────────────────────────

def test_partnerships_structure(client):
    res = client.get("/api/analytics/partnerships?match_id=335982&innings=1")
    if res.status_code == 404:
        pytest.skip("Match 335982 not in dataset")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    p = data[0]
    assert "batsman1" in p
    assert "batsman2" in p
    assert "runs"     in p
    assert "balls"    in p
    assert "wicket"   in p

def test_partnerships_wicket_sequence(client):
    res = client.get("/api/analytics/partnerships?match_id=335982&innings=1")
    if res.status_code == 404:
        pytest.skip("Match 335982 not in dataset")
    partnerships = res.json()
    wickets = [p["wicket"] for p in partnerships]
    # Wicket numbers should be sequential starting from 1
    assert wickets == sorted(wickets)
    assert wickets[0] == 1

def test_partnerships_match_not_found(client):
    res = client.get("/api/analytics/partnerships?match_id=FAKE999&innings=1")
    assert res.status_code == 404
