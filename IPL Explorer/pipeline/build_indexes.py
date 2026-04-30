"""
build_indexes.py
================
Builds three JSON index files from the processed CSVs:
  - player_index.json  : { player_name: { match_ids: [...], registry_id: str } }
  - season_index.json  : { season: { match_ids: [...], teams: [...] } }
  - team_index.json    : { team_name: { match_ids: [...] } }

Also reads the raw YAML files to populate player squad membership
(players who were in the XI but did not bat or bowl).

Run after ipl_yaml_to_csv.py:
    python build_indexes.py --processed data/processed --raw data/raw
"""

import os
import csv
import json
import argparse
import yaml
from pathlib import Path
from collections import defaultdict
import sys

sys.path.insert(0, str(Path(__file__).parent))
from team_names import canonical_team


def build_indexes(processed_dir: str, raw_dir: str):
    processed = Path(processed_dir)
    raw       = Path(raw_dir)

    matches_csv    = processed / "matches.csv"
    deliveries_csv = processed / "deliveries.csv"

    if not matches_csv.exists():
        raise FileNotFoundError(f"{matches_csv} not found — run ipl_yaml_to_csv.py first")

    # ── Load matches ────────────────────────────────────────────────────────
    matches = []
    with open(matches_csv) as f:
        for row in csv.DictReader(f):
            matches.append(row)

    # ── Season index ────────────────────────────────────────────────────────
    season_index = defaultdict(lambda: {"match_ids": [], "teams": set()})
    for m in matches:
        s = m["season"]
        season_index[s]["match_ids"].append(m["match_id"])
        season_index[s]["teams"].add(m["team1"])
        season_index[s]["teams"].add(m["team2"])

    season_index_out = {
        s: {"match_ids": v["match_ids"], "teams": sorted(v["teams"])}
        for s, v in season_index.items()
    }

    # ── Team index ──────────────────────────────────────────────────────────
    team_index = defaultdict(lambda: {"match_ids": []})
    for m in matches:
        team_index[m["team1"]]["match_ids"].append(m["match_id"])
        team_index[m["team2"]]["match_ids"].append(m["match_id"])

    # ── Player index — from YAML squad lists (includes DNB players) ─────────
    player_index = defaultdict(lambda: {"match_ids": [], "registry_id": ""})
    match_id_to_yaml = {}

    yaml_files = list(raw.glob("*.yaml")) + list(raw.glob("*.yml"))
    for yf in yaml_files:
        match_id = yf.stem
        match_id_to_yaml[match_id] = yf

    for m in matches:
        mid  = m["match_id"]
        yf   = match_id_to_yaml.get(mid)
        if not yf:
            continue
        try:
            with open(yf) as f:
                data = yaml.safe_load(f)
        except Exception:
            continue

        info     = data.get("info", {})
        players  = info.get("players", {})
        registry = info.get("registry", {}).get("people", {})

        for team, squad in players.items():
            for player in squad:
                player_index[player]["match_ids"].append(mid)
                if player in registry:
                    player_index[player]["registry_id"] = registry[player]

    # If no YAML files (unlikely), fall back to delivery appearances
    if not yaml_files and deliveries_csv.exists():
        print("No YAML files found — building player index from deliveries only")
        with open(deliveries_csv) as f:
            for row in csv.DictReader(f):
                mid = row["match_id"]
                for field in ["batsman", "non_striker", "bowler"]:
                    p = row.get(field, "")
                    if p:
                        if mid not in player_index[p]["match_ids"]:
                            player_index[p]["match_ids"].append(mid)

    player_index_out = {
        p: {"match_ids": list(dict.fromkeys(v["match_ids"])), "registry_id": v["registry_id"]}
        for p, v in player_index.items()
    }

    # ── Write ────────────────────────────────────────────────────────────────
    with open(processed / "season_index.json", "w") as f:
        json.dump(season_index_out, f, indent=2)

    with open(processed / "team_index.json", "w") as f:
        json.dump(dict(team_index), f, indent=2)

    with open(processed / "player_index.json", "w") as f:
        json.dump(player_index_out, f, indent=2)

    print(f"Indexes written to {processed}/")
    print(f"  player_index.json : {len(player_index_out):,} players")
    print(f"  season_index.json : {len(season_index_out):,} seasons")
    print(f"  team_index.json   : {len(team_index):,} teams")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--processed", default="data/processed")
    parser.add_argument("--raw",       default="data/raw")
    args = parser.parse_args()
    build_indexes(args.processed, args.raw)
