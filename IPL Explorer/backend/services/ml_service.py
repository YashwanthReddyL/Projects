"""
ml_service.py
=============
Loads the trained win probability model once at startup and provides
fast in-process inference. No sklearn needed at runtime — pure numpy math.

The model coefficients are loaded from win_model.json (JSON, not pickle).
Prediction is: sigmoid(dot(scale(x), coef) + intercept)
"""

import json
import math
import numpy as np
from pathlib import Path
from functools import lru_cache
from typing import Optional


class WinProbabilityModel:
    """
    Logistic Regression inference without sklearn dependency.
    Loads coefficients from JSON and runs matrix math directly.
    """

    def __init__(self, model_path: Path):
        with open(model_path) as f:
            data = json.load(f)

        self.features      = data["features"]
        self.coef          = np.array(data["coef"])
        self.intercept     = float(data["intercept"])
        self.scaler_mean   = np.array(data["scaler_mean"])
        self.scaler_scale  = np.array(data["scaler_scale"])
        self.n_samples     = data.get("n_training_samples", 0)
        self.feature_importance = data.get("feature_importance", {})

    def _scale(self, x: np.ndarray) -> np.ndarray:
        return (x - self.scaler_mean) / (self.scaler_scale + 1e-8)

    def _sigmoid(self, z: float) -> float:
        return 1.0 / (1.0 + math.exp(-max(-500, min(500, z))))

    def predict_proba(self, feature_dict: dict) -> float:
        """
        Returns probability that the batting team wins (0-1).
        feature_dict must contain all keys in self.features.
        """
        x = np.array([float(feature_dict.get(f, 0)) for f in self.features])
        x_scaled = self._scale(x)
        z = float(np.dot(x_scaled, self.coef)) + self.intercept
        return self._sigmoid(z)


@lru_cache(maxsize=1)
def get_model() -> Optional[WinProbabilityModel]:
    """Singleton — loaded once, cached forever."""
    candidates = [
        Path("data/processed/win_model.json"),
        Path("../data/processed/win_model.json"),
        Path(__file__).parent.parent.parent / "data" / "processed" / "win_model.json",
    ]
    for p in candidates:
        if p.exists():
            print(f"[ML] Loaded win model from {p.resolve()}")
            return WinProbabilityModel(p)
    print("[ML] win_model.json not found — run pipeline/train_win_model.py first")
    return None


def predict_win_probability(
    innings: int,
    over: int,
    ball: int,
    runs_so_far: int,
    wickets_so_far: int,
    target: int = 0,
    total_balls: int = 120,
) -> dict:
    """
    High-level function called by the router.
    Returns a dict with batting_team win probability and supporting context.
    """
    model = get_model()

    legal_balls = (over * 6) + ball
    balls_remaining = max(0, total_balls - legal_balls)
    overs_done = legal_balls / 6
    crr = runs_so_far / overs_done if overs_done >= 1 else float(runs_so_far)

    if innings == 2:
        runs_required = max(0, target - runs_so_far)
        rrr_raw = runs_required / (balls_remaining / 6) if balls_remaining > 0 else 99.0
        rrr = min(rrr_raw, 36.0)
        pct_target = min(runs_so_far / target, 1.5) if target > 0 else 0.0
    else:
        runs_required = 0
        rrr = 0.0
        pct_target = 0.0

    features = {
        "innings":         float(innings),
        "over":            float(over),
        "runs_so_far":     float(runs_so_far),
        "wickets_so_far":  float(wickets_so_far),
        "balls_remaining": float(balls_remaining),
        "crr":             crr,
        "rrr":             rrr,
        "runs_required":   float(runs_required),
        "target":          float(target),
        "pct_target":      pct_target,
        "pct_balls_used":  legal_balls / total_balls,
        "wickets_in_hand": float(10 - wickets_so_far),
    }

    batting_win_prob = model.predict_proba(features) if model else 0.5
    # Clamp to [2%, 98%] to avoid overconfident extremes in UI
    batting_win_prob = max(0.02, min(0.98, batting_win_prob))

    return {
        "batting_win_prob":  round(batting_win_prob, 4),
        "bowling_win_prob":  round(1 - batting_win_prob, 4),
        "context": {
            "innings":          innings,
            "over":             over,
            "ball":             ball,
            "runs_so_far":      runs_so_far,
            "wickets_so_far":   wickets_so_far,
            "balls_remaining":  balls_remaining,
            "crr":              round(crr, 2),
            "rrr":              round(rrr, 2) if innings == 2 else None,
            "runs_required":    runs_required if innings == 2 else None,
            "target":           target if innings == 2 else None,
        },
        "model_trained_on": model.n_samples if model else 0,
    }
