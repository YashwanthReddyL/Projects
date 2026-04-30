"""
IPL YAML → CSV Converter
========================
Converts all IPL match YAML files into two clean CSVs:
  - matches.csv    : one row per match
  - deliveries.csv : one row per ball

Usage
-----
    python ipl_yaml_to_csv.py --input ./your_yaml_folder --output ./output

Requirements: pip install pyyaml
"""

import os
import csv
import glob
import argparse
import yaml
from pathlib import Path

# Add pipeline directory to path so team_names is importable
import sys
sys.path.insert(0, str(Path(__file__).parent))
from team_names import canonical_team


# ── Column definitions ────────────────────────────────────────────────────────

MATCHES_COLS = [
    "match_id",
    "date",
    "season",
    "city",
    "venue",
    "team1",
    "team2",
    "toss_winner",
    "toss_decision",
    "winner",
    "win_by_runs",
    "win_by_wickets",
    "result",          # "normal" | "tie" | "no result"
    "player_of_match",
    "umpire1",
    "umpire2",
]

DELIVERIES_COLS = [
    "match_id",
    "date",
    "season",
    "innings",          # 1-N: 1=first, 2=second, 3+=super over. Can exceed 4 if SO ties.
    "is_super_over",    # 0 = regular innings, 1 = super over (innings >= 3)
    "batting_team",
    "bowling_team",
    "over",             # 0-indexed (0 = first over)
    "ball",             # ball within over, as in YAML (1-6, plus extras like 7)
    "batsman",
    "non_striker",
    "bowler",
    "runs_batsman",
    "runs_extras",
    "runs_total",
    "extras_wides",
    "extras_noballs",
    "extras_legbyes",
    "extras_byes",
    "extras_penalty",
    "is_wicket",        # 0 or 1
    "wicket_kind",      # caught / bowled / run out / lbw / stumped / etc.
    "player_dismissed",
    "fielder1",
    "fielder2",         # run-outs can have two fielders
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def safe(d, *keys, default=""):
    """Safely navigate nested dict, return default if any key is missing."""
    for key in keys:
        if not isinstance(d, dict):
            return default
        d = d.get(key, None)
        if d is None:
            return default
    return d if d != "" else default


def extract_match_info(match_id: str, data: dict) -> dict:
    info = data.get("info", {})

    # Date — files can have multiple dates (D/N games); take first
    dates = info.get("dates", [])
    date = str(dates[0]) if dates else ""
    season = date[:4] if date else ""

    # Teams — always two in IPL; normalise to canonical names
    teams = info.get("teams", [])
    team1 = canonical_team(teams[0]) if len(teams) > 0 else ""
    team2 = canonical_team(teams[1]) if len(teams) > 1 else ""

    # Outcome
    outcome = info.get("outcome", {})
    winner = canonical_team(safe(outcome, "winner")) if safe(outcome, "winner") else ""
    win_by = outcome.get("by", {})
    win_by_runs = safe(win_by, "runs", default=0)
    win_by_wickets = safe(win_by, "wickets", default=0)

    # Result type
    if "winner" in outcome:
        result = "normal"
    elif "tie" in outcome:
        result = "tie"
    else:
        result = "no result"

    # Player of match (list → semicolon-joined string)
    pom_list = info.get("player_of_match", [])
    player_of_match = "; ".join(pom_list) if pom_list else ""

    # Umpires
    umpires = info.get("umpires", [])
    umpire1 = umpires[0] if len(umpires) > 0 else ""
    umpire2 = umpires[1] if len(umpires) > 1 else ""

    return {
        "match_id":       match_id,
        "date":           date,
        "season":         season,
        "city":           safe(info, "city"),
        "venue":          safe(info, "venue"),
        "team1":          team1,
        "team2":          team2,
        "toss_winner":    canonical_team(safe(info, "toss", "winner")),
        "toss_decision":  safe(info, "toss", "decision"),
        "winner":         winner,
        "win_by_runs":    int(win_by_runs) if win_by_runs else 0,
        "win_by_wickets": int(win_by_wickets) if win_by_wickets else 0,
        "result":         result,
        "player_of_match": player_of_match,
        "umpire1":        umpire1,
        "umpire2":        umpire2,
    }


def extract_deliveries(match_id: str, date: str, season: str, data: dict) -> list:
    """Parse all innings and deliveries into flat row dicts."""
    rows = []
    info = data.get("info", {})
    teams = info.get("teams", [])
    innings_list = data.get("innings", [])

    for innings_index, innings_block in enumerate(innings_list):
        # innings_block keys: "1st innings", "2nd innings", "3rd innings" (super over 1),
        # "4th innings" (super over 2).  We keep the raw number (1-4) in the CSV so
        # every row is unambiguous, and write is_super_over=1 for innings 3+.
        for innings_label, innings_data in innings_block.items():
            raw_innings_num = innings_index + 1
            is_super_over   = 1 if raw_innings_num > 2 else 0
            innings_num     = raw_innings_num          # write 1, 2, 3 or 4 as-is
            batting_team = canonical_team(safe(innings_data, "team"))
            # bowling team = the other team; normalise teams list first
            canonical_teams = [canonical_team(t) for t in teams]
            bowling_team = next((t for t in canonical_teams if t != batting_team), "")

            deliveries = innings_data.get("deliveries", [])
            for delivery in deliveries:
                # delivery is a dict with one key like "0.1" or "14.7"
                for over_ball_str, ball_data in delivery.items():
                    # Parse "over.ball" — e.g. "0.1" → over=0, ball=1
                    parts = str(over_ball_str).split(".")
                    over_num = int(parts[0]) if len(parts) > 0 else 0
                    ball_num = int(parts[1]) if len(parts) > 1 else 0

                    # Runs
                    runs = ball_data.get("runs", {})
                    runs_batsman = int(safe(runs, "batsman", default=0))
                    runs_extras  = int(safe(runs, "extras",  default=0))
                    runs_total   = int(safe(runs, "total",   default=0))

                    # Extras breakdown
                    extras = ball_data.get("extras", {})
                    ext_wides   = int(extras.get("wides",   0))
                    ext_noballs = int(extras.get("noballs", 0))
                    ext_legbyes = int(extras.get("legbyes", 0))
                    ext_byes    = int(extras.get("byes",    0))
                    ext_penalty = int(extras.get("penalty", 0))

                    # Wicket
                    wicket = ball_data.get("wicket", None)
                    is_wicket = 1 if wicket else 0
                    wicket_kind      = safe(wicket, "kind")      if wicket else ""
                    player_dismissed = safe(wicket, "player_out") if wicket else ""

                    fielders = wicket.get("fielders", []) if wicket else []
                    fielder1 = fielders[0] if len(fielders) > 0 else ""
                    fielder2 = fielders[1] if len(fielders) > 1 else ""

                    rows.append({
                        "match_id":        match_id,
                        "date":            date,
                        "season":          season,
                        "innings":         innings_num,
                        "is_super_over":   is_super_over,
                        "batting_team":    batting_team,
                        "bowling_team":    bowling_team,
                        "over":            over_num,
                        "ball":            ball_num,
                        "batsman":         safe(ball_data, "batsman"),
                        "non_striker":     safe(ball_data, "non_striker"),
                        "bowler":          safe(ball_data, "bowler"),
                        "runs_batsman":    runs_batsman,
                        "runs_extras":     runs_extras,
                        "runs_total":      runs_total,
                        "extras_wides":    ext_wides,
                        "extras_noballs":  ext_noballs,
                        "extras_legbyes":  ext_legbyes,
                        "extras_byes":     ext_byes,
                        "extras_penalty":  ext_penalty,
                        "is_wicket":       is_wicket,
                        "wicket_kind":     wicket_kind,
                        "player_dismissed": player_dismissed,
                        "fielder1":        fielder1,
                        "fielder2":        fielder2,
                    })

    return rows


# ── Main ──────────────────────────────────────────────────────────────────────

def convert(input_dir: str, output_dir: str):
    input_path  = Path(input_dir)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    yaml_files = sorted(glob.glob(str(input_path / "*.yaml")) +
                        glob.glob(str(input_path / "*.yml")))

    if not yaml_files:
        print(f"[ERROR] No YAML files found in: {input_path}")
        return

    print(f"Found {len(yaml_files)} YAML files. Processing...")

    matches_out    = output_path / "matches.csv"
    deliveries_out = output_path / "deliveries.csv"

    skipped = 0
    processed = 0

    with open(matches_out, "w", newline="", encoding="utf-8") as mf, \
         open(deliveries_out, "w", newline="", encoding="utf-8") as df:

        match_writer    = csv.DictWriter(mf, fieldnames=MATCHES_COLS)
        delivery_writer = csv.DictWriter(df, fieldnames=DELIVERIES_COLS)

        match_writer.writeheader()
        delivery_writer.writeheader()

        for yaml_path in yaml_files:
            # Use filename stem as match_id (e.g. "335982")
            match_id = Path(yaml_path).stem

            try:
                with open(yaml_path, "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f)
            except Exception as e:
                print(f"  [SKIP] {match_id} — YAML parse error: {e}")
                skipped += 1
                continue

            if not isinstance(data, dict) or "info" not in data:
                print(f"  [SKIP] {match_id} — unexpected structure")
                skipped += 1
                continue

            try:
                match_row = extract_match_info(match_id, data)
                match_writer.writerow(match_row)

                delivery_rows = extract_deliveries(
                    match_id,
                    match_row["date"],
                    match_row["season"],
                    data,
                )
                delivery_writer.writerows(delivery_rows)

                processed += 1
                if processed % 100 == 0:
                    print(f"  Processed {processed} files...")

            except Exception as e:
                print(f"  [SKIP] {match_id} — processing error: {e}")
                skipped += 1
                continue

    print(f"\nDone!")
    print(f"  Matches processed : {processed}")
    print(f"  Files skipped     : {skipped}")
    print(f"  matches.csv    → {matches_out}")
    print(f"  deliveries.csv → {deliveries_out}")


def main():
    parser = argparse.ArgumentParser(description="Convert IPL YAML files to CSV.")
    parser.add_argument(
        "--input", "-i",
        default=".",
        help="Folder containing YAML files (default: current directory)",
    )
    parser.add_argument(
        "--output", "-o",
        default="./ipl_data",
        help="Output folder for CSV files (default: ./ipl_data)",
    )
    args = parser.parse_args()
    convert(args.input, args.output)


if __name__ == "__main__":
    main()
