"""
data_loader.py
==============
Loads processed CSVs and JSON indexes into memory once at startup.
Every router imports get_store() — nothing else reads files directly.

The DataStore is a singleton: created once, shared across all requests.
"""

import json
import pandas as pd
from pathlib import Path
from functools import lru_cache
from dataclasses import dataclass, field


@dataclass
class DataStore:
    matches: pd.DataFrame
    deliveries: pd.DataFrame
    player_index: dict
    season_index: dict
    team_index: dict


@lru_cache(maxsize=1)
def get_store() -> DataStore:
    """
    Load all processed data into memory.
    Called once on first request; result cached forever.
    FastAPI lifespan can call this on startup to pre-warm.
    """
    base = _find_processed_dir()

    print(f"[DataLoader] Loading from: {base}")

    matches = pd.read_csv(
        base / "matches.csv",
        dtype={"match_id": str, "season": str},
    )
    deliveries = pd.read_csv(
        base / "deliveries.csv",
        dtype={"match_id": str, "season": str},
    )

    # Coerce numeric columns that pandas might read as object
    int_cols = [
        "runs_batsman", "runs_extras", "runs_total",
        "extras_wides", "extras_noballs", "extras_legbyes",
        "extras_byes", "extras_penalty", "is_wicket",
        "over", "ball", "innings", "is_super_over",
    ]
    for col in int_cols:
        if col in deliveries.columns:
            deliveries[col] = pd.to_numeric(deliveries[col], errors="coerce").fillna(0).astype(int)

    # Fill NaN strings with empty string
    str_cols = ["batsman", "bowler", "non_striker", "wicket_kind",
                "player_dismissed", "fielder1", "fielder2",
                "batting_team", "bowling_team"]
    for col in str_cols:
        if col in deliveries.columns:
            deliveries[col] = deliveries[col].fillna("")

    with open(base / "player_index.json", encoding="utf-8") as f:
        player_index = json.load(f)
    with open(base / "season_index.json", encoding="utf-8") as f:
        season_index = json.load(f)
    with open(base / "team_index.json", encoding="utf-8") as f:
        team_index = json.load(f)

    print(f"[DataLoader] Loaded {len(matches)} matches, "
          f"{len(deliveries):,} deliveries, "
          f"{len(player_index)} players")

    return DataStore(
        matches=matches,
        deliveries=deliveries,
        player_index=player_index,
        season_index=season_index,
        team_index=team_index,
    )


def _find_processed_dir() -> Path:
    """
    Locate the processed/ directory relative to the project root.
    Works whether you run uvicorn from backend/ or from the project root.
    """
    candidates = [
        Path("data/processed"),
        Path("../data/processed"),
        Path(__file__).parent.parent.parent / "data" / "processed",
    ]
    for path in candidates:
        if (path / "matches.csv").exists():
            return path.resolve()
    raise FileNotFoundError(
        "Cannot find data/processed/matches.csv. "
        "Run pipeline/run_pipeline.sh first."
    )
