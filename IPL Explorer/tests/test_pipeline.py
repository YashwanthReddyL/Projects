"""
test_pipeline.py
================
Validates the CSV pipeline output against known values
from the sample match file (335982.yaml — KKR vs RCB 2008).

Run with:
    pytest tests/test_pipeline.py -v
"""

import csv
import sys
import pytest
from pathlib import Path

# Allow running from project root or tests/
PROCESSED = Path(__file__).parent.parent / "data" / "processed"


def load_csv(name: str) -> list[dict]:
    path = PROCESSED / name
    if not path.exists():
        pytest.skip(f"{name} not found — run the pipeline first")
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


# ── matches.csv ───────────────────────────────────────────────────────────────

class TestMatchesCSV:
    def test_file_exists(self):
        assert (PROCESSED / "matches.csv").exists(), \
            "matches.csv missing — run pipeline/run_pipeline.sh"

    def test_has_rows(self):
        rows = load_csv("matches.csv")
        assert len(rows) > 0

    def test_required_columns(self):
        rows = load_csv("matches.csv")
        required = [
            "match_id", "date", "season", "city", "venue",
            "team1", "team2", "toss_winner", "toss_decision",
            "winner", "win_by_runs", "win_by_wickets",
            "result", "player_of_match", "umpire1", "umpire2",
        ]
        for col in required:
            assert col in rows[0], f"Column '{col}' missing from matches.csv"

    def test_no_duplicate_match_ids(self):
        rows = load_csv("matches.csv")
        ids = [r["match_id"] for r in rows]
        assert len(ids) == len(set(ids)), "Duplicate match_ids found in matches.csv"

    def test_sample_match_335982(self):
        """KKR vs RCB, 2008-04-18 — known ground truth."""
        rows = load_csv("matches.csv")
        row = next((r for r in rows if r["match_id"] == "335982"), None)
        if row is None:
            pytest.skip("Sample match 335982 not in dataset")

        assert row["season"]       == "2008"
        assert row["city"]         == "Bangalore"
        assert row["venue"]        == "M Chinnaswamy Stadium"
        assert row["winner"]       == "Kolkata Knight Riders"
        assert row["win_by_runs"]  == "140"
        assert row["toss_decision"] == "field"
        assert "BB McCullum" in row["player_of_match"]
        assert row["umpire1"]      == "Asad Rauf"
        assert row["result"]       == "normal"


# ── deliveries.csv ────────────────────────────────────────────────────────────

class TestDeliveriesCSV:
    def test_file_exists(self):
        assert (PROCESSED / "deliveries.csv").exists(), \
            "deliveries.csv missing — run pipeline/run_pipeline.sh"

    def test_has_rows(self):
        rows = load_csv("deliveries.csv")
        assert len(rows) > 0

    def test_required_columns(self):
        rows = load_csv("deliveries.csv")
        required = [
            "match_id", "innings", "over", "ball",
            "batsman", "bowler", "runs_batsman", "runs_extras",
            "runs_total", "is_wicket", "wicket_kind", "player_dismissed",
        ]
        for col in required:
            assert col in rows[0], f"Column '{col}' missing from deliveries.csv"

    def test_runs_integrity(self):
        """runs_total must equal runs_batsman + runs_extras for every row."""
        rows = load_csv("deliveries.csv")
        bad = [
            r for r in rows
            if int(r["runs_total"]) != int(r["runs_batsman"]) + int(r["runs_extras"])
        ]
        assert len(bad) == 0, f"{len(bad)} rows fail runs_total integrity check"

    def test_sample_match_335982_delivery_count(self):
        rows = load_csv("deliveries.csv")
        match_rows = [r for r in rows if r["match_id"] == "335982"]
        if not match_rows:
            pytest.skip("Sample match 335982 not in dataset")
        # 225 deliveries known from manual inspection
        assert len(match_rows) == 225, \
            f"Expected 225 deliveries for 335982, got {len(match_rows)}"

    def test_sample_match_335982_wickets(self):
        rows = load_csv("deliveries.csv")
        wickets = [
            r for r in rows
            if r["match_id"] == "335982" and r["is_wicket"] == "1"
        ]
        if not wickets:
            pytest.skip("Sample match 335982 not in dataset")
        assert len(wickets) == 13, \
            f"Expected 13 wickets for 335982, got {len(wickets)}"

    def test_sample_match_335982_mccullum_runs(self):
        rows = load_csv("deliveries.csv")
        mcc = [
            r for r in rows
            if r["match_id"] == "335982"
            and r["innings"] == "1"
            and r["batsman"] == "BB McCullum"
        ]
        if not mcc:
            pytest.skip("Sample match 335982 not in dataset")
        runs = sum(int(r["runs_batsman"]) for r in mcc)
        # McCullum scored 158* in this match
        assert runs == 158, f"Expected McCullum 158 runs, got {runs}"

    def test_run_out_two_fielders(self):
        """AA Noffke run-out in match 335982 had two fielders."""
        rows = load_csv("deliveries.csv")
        runout = next(
            (r for r in rows
             if r["match_id"] == "335982"
             and r["wicket_kind"] == "run out"
             and r["player_dismissed"] == "AA Noffke"),
            None,
        )
        if runout is None:
            pytest.skip("Sample match 335982 not in dataset")
        assert runout["fielder1"] == "AB Agarkar"
        assert runout["fielder2"] == "WP Saha"

    def test_no_null_batsman(self):
        rows = load_csv("deliveries.csv")
        nulls = [r for r in rows if not r.get("batsman")]
        assert len(nulls) == 0, f"{len(nulls)} rows have empty batsman"

    def test_innings_values(self):
        rows = load_csv("deliveries.csv")
        # innings must be a positive integer — no upper bound.
        # 1-2 = regular innings, 3+ = super overs (can chain if SO ties).
        bad = [r for r in rows if not r["innings"].isdigit() or int(r["innings"]) < 1]
        assert len(bad) == 0, \
            f"{len(bad)} rows have invalid innings value. " \
            f"Sample values: {list(set(r['innings'] for r in bad))[:10]}"

    def test_super_over_innings_flagged(self):
        """All innings >= 3 must have is_super_over == '1'. innings 1-2 must have '0'."""
        rows = load_csv("deliveries.csv")
        super_over_rows = [r for r in rows if int(r["innings"]) >= 3]
        if not super_over_rows:
            pytest.skip("No super over matches in this dataset")

        # is_super_over must be '1' for all innings >= 3
        wrong = [r for r in super_over_rows if r["is_super_over"] != "1"]
        assert len(wrong) == 0, \
            f"{len(wrong)} super over rows have is_super_over != '1'"

        # is_super_over must be '0' for all innings 1-2
        regular_rows = [r for r in rows if int(r["innings"]) <= 2]
        wrong_reg = [r for r in regular_rows if r["is_super_over"] != "0"]
        assert len(wrong_reg) == 0, \
            f"{len(wrong_reg)} regular innings rows have is_super_over != '0'"

        # All super over rows must still have valid batsman and bowler
        bad = [r for r in super_over_rows if not r["batsman"] or not r["bowler"]]
        assert len(bad) == 0, \
            f"{len(bad)} super over rows are missing batsman/bowler"

        # Report what we found
        max_inn = max(int(r["innings"]) for r in super_over_rows)
        match_ids = set(r["match_id"] for r in super_over_rows)
        print(f"\n  Super over rows: {len(super_over_rows)} across {len(match_ids)} matches")
        print(f"  Max innings seen: {max_inn}"
              + (" (double super over!)" if max_inn >= 5 else ""))


# ── Indexes ───────────────────────────────────────────────────────────────────

class TestIndexes:
    def test_player_index_exists(self):
        assert (PROCESSED / "player_index.json").exists(), \
            "player_index.json missing — run pipeline/build_indexes.py"

    def test_season_index_exists(self):
        assert (PROCESSED / "season_index.json").exists()

    def test_team_index_exists(self):
        assert (PROCESSED / "team_index.json").exists()

    def test_player_index_sample(self):
        import json
        path = PROCESSED / "player_index.json"
        if not path.exists():
            pytest.skip("player_index.json missing")
        with open(path) as f:
            idx = json.load(f)
        # BB McCullum must be indexed
        assert "BB McCullum" in idx, "BB McCullum not found in player_index"
        assert "335982" in idx["BB McCullum"]["match_ids"]
