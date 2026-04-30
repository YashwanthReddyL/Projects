"""
validate.py
===========
Sanity checks on the processed CSVs before the backend loads them.
Run after build_indexes.py:
    python validate.py --processed data/processed

Exits with code 1 if any check fails.
"""

import csv
import json
import sys
from pathlib import Path
from collections import Counter


def validate(processed_dir: str):
    processed = Path(processed_dir)
    errors    = []
    warnings  = []

    def check(condition, msg, is_error=True):
        if not condition:
            (errors if is_error else warnings).append(msg)

    # ── Files exist ──────────────────────────────────────────────────────────
    for fname in ["matches.csv", "deliveries.csv", "player_index.json",
                  "season_index.json", "team_index.json"]:
        check((processed / fname).exists(), f"Missing file: {fname}")

    if errors:
        for e in errors:
            print(f"ERROR: {e}")
        sys.exit(1)

    # ── Load ─────────────────────────────────────────────────────────────────
    matches    = list(csv.DictReader(open(processed / "matches.csv")))
    deliveries = list(csv.DictReader(open(processed / "deliveries.csv")))
    p_index    = json.load(open(processed / "player_index.json"))
    s_index    = json.load(open(processed / "season_index.json"))
    t_index    = json.load(open(processed / "team_index.json"))

    print(f"Loaded: {len(matches):,} matches, {len(deliveries):,} deliveries")

    # ── Match checks ─────────────────────────────────────────────────────────
    match_ids = set(m["match_id"] for m in matches)
    check(len(matches) > 0, "No matches found")
    check(len(match_ids) == len(matches), "Duplicate match IDs detected")

    # No old team name variants
    all_teams = set()
    for m in matches:
        all_teams.add(m["team1"])
        all_teams.add(m["team2"])

    stale = {"Delhi Daredevils", "Kings XI Punjab",
             "Royal Challengers Bangalore", "Rising Pune Supergiants"}
    for t in stale:
        check(t not in all_teams, f"Stale team name still present: '{t}'", is_error=False)

    # ── Delivery checks ───────────────────────────────────────────────────────
    check(len(deliveries) > 0, "No deliveries found")

    delivery_match_ids = set(r["match_id"] for r in deliveries)
    orphans = delivery_match_ids - match_ids
    check(len(orphans) == 0,
          f"{len(orphans)} delivery match_ids not in matches.csv: {list(orphans)[:5]}")

    # is_super_over consistency
    so_errors = [r for r in deliveries
                 if int(r["innings"]) >= 3 and r["is_super_over"] != "1"]
    check(len(so_errors) == 0,
          f"{len(so_errors)} super over rows have is_super_over != '1'")

    reg_errors = [r for r in deliveries
                  if int(r["innings"]) <= 2 and r["is_super_over"] != "0"]
    check(len(reg_errors) == 0,
          f"{len(reg_errors)} regular innings rows have is_super_over != '0'")

    # ── Index checks ──────────────────────────────────────────────────────────
    check(len(p_index) > 0, "player_index.json is empty")
    check(len(s_index) > 0, "season_index.json is empty")
    check(len(t_index) > 0, "team_index.json is empty")

    # Every season in matches should be in season_index
    match_seasons = set(m["season"] for m in matches)
    for s in match_seasons:
        check(s in s_index, f"Season '{s}' missing from season_index.json")

    # ── Report ────────────────────────────────────────────────────────────────
    print(f"Teams    : {sorted(all_teams)}")
    print(f"Seasons  : {sorted(s_index.keys())}")
    print(f"Players  : {len(p_index):,}")

    for w in warnings:
        print(f"WARNING : {w}")

    if errors:
        for e in errors:
            print(f"ERROR   : {e}")
        print(f"\n{len(errors)} error(s) found — fix before deploying.")
        sys.exit(1)
    else:
        print(f"\nAll checks passed ({len(warnings)} warning(s)).")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--processed", default="data/processed")
    args = parser.parse_args()
    validate(args.processed)
