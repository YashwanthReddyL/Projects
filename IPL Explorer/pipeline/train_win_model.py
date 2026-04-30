"""
train_win_model.py
==================
Trains a Logistic Regression win-probability model on historical IPL ball-by-ball data.
Saves the model + scaler as JSON (no pickle — portable, version-safe).

Features engineered at every delivery:
  Inn 1: runs_so_far, wickets_so_far, balls_remaining, crr, over_bucket
  Inn 2: runs_so_far, wickets_so_far, balls_remaining, crr, rrr,
          runs_required, target, pct_target_achieved, pct_balls_used

Model: Logistic Regression with L2 regularisation (sklearn)
Output: data/processed/win_model.json  (coefficients + scaler params)

Run:
    cd backend
    python ../pipeline/train_win_model.py
    # or from project root:
    python pipeline/train_win_model.py
"""

import json
import sys
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score
from sklearn.metrics import roc_auc_score

# Locate data directory
candidates = [
    Path("data/processed"),
    Path("../data/processed"),
    Path(__file__).parent.parent / "data" / "processed",
]
DATA_DIR = next((p for p in candidates if (p / "deliveries.csv").exists()), None)
if DATA_DIR is None:
    print("ERROR: data/processed/deliveries.csv not found. Run the pipeline first.")
    sys.exit(1)

print(f"Loading data from {DATA_DIR.resolve()}...")
df      = pd.read_csv(DATA_DIR / "deliveries.csv", dtype=str)
matches = pd.read_csv(DATA_DIR / "matches.csv",    dtype=str)

# Cast numeric columns
int_cols = ["innings", "is_super_over", "over", "ball", "runs_total",
            "extras_wides", "is_wicket"]
for col in int_cols:
    df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)

print(f"Deliveries: {len(df):,}  |  Matches: {len(matches):,}")

# ── Feature engineering ────────────────────────────────────────────────────────

def build_states(df: pd.DataFrame, matches: pd.DataFrame) -> pd.DataFrame:
    """
    For every legal delivery in every regular innings, compute the game state
    and whether the batting team ultimately won the match.
    """
    match_winners = dict(zip(matches["match_id"], matches["winner"]))
    records: list[dict] = []

    reg = df[df["is_super_over"] == 0]

    for match_id, mdf in reg.groupby("match_id"):
        winner = match_winners.get(match_id, "")
        inn1   = mdf[mdf["innings"] == 1]
        inn1_total = int(inn1["runs_total"].sum())
        target = inn1_total + 1

        for innings in [1, 2]:
            inn_df = mdf[mdf["innings"] == innings]
            if inn_df.empty:
                continue

            batting_team = inn_df["batting_team"].iloc[0]
            batting_won  = 1 if winner == batting_team else 0

            runs       = 0
            wickets    = 0
            legal_balls = 0

            for _, row in inn_df.iterrows():
                is_legal = row["extras_wides"] == 0
                if is_legal:
                    legal_balls += 1

                runs    += row["runs_total"]
                wickets += row["is_wicket"]

                balls_rem = max(0, 120 - legal_balls)
                overs_done = legal_balls / 6
                crr = runs / overs_done if overs_done >= 1 else runs  # runs/over

                if innings == 1:
                    records.append({
                        "innings":           1,
                        "over":              int(row["over"]),
                        "runs_so_far":       runs,
                        "wickets_so_far":    wickets,
                        "balls_remaining":   balls_rem,
                        "crr":               crr,
                        "rrr":               0.0,
                        "runs_required":     0,
                        "target":            0,
                        "pct_target":        0.0,
                        "pct_balls_used":    legal_balls / 120,
                        "wickets_in_hand":   10 - wickets,
                        "won":               batting_won,
                    })
                else:
                    runs_req = max(0, target - runs)
                    rrr = (runs_req / (balls_rem / 6)) if balls_rem > 0 else 99.0
                    pct_target = runs / target if target > 0 else 0.0
                    records.append({
                        "innings":           2,
                        "over":              int(row["over"]),
                        "runs_so_far":       runs,
                        "wickets_so_far":    wickets,
                        "balls_remaining":   balls_rem,
                        "crr":               crr,
                        "rrr":               min(rrr, 36.0),   # cap outliers
                        "runs_required":     runs_req,
                        "target":            target,
                        "pct_target":        min(pct_target, 1.5),
                        "pct_balls_used":    legal_balls / 120,
                        "wickets_in_hand":   10 - wickets,
                        "won":               batting_won,
                    })

    return pd.DataFrame(records)

print("Building game states...")
states = build_states(df, matches)
print(f"States: {len(states):,}  |  Win rate: {states['won'].mean():.3f}")

# ── Feature matrix ─────────────────────────────────────────────────────────────

FEATURES = [
    "innings",
    "over",
    "runs_so_far",
    "wickets_so_far",
    "balls_remaining",
    "crr",
    "rrr",
    "runs_required",
    "target",
    "pct_target",
    "pct_balls_used",
    "wickets_in_hand",
]

X = states[FEATURES].values.astype(float)
y = states["won"].values.astype(int)

# ── Scale ──────────────────────────────────────────────────────────────────────
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# ── Train ──────────────────────────────────────────────────────────────────────
print("Training Logistic Regression...")
model = LogisticRegression(
    C=1.0,
    max_iter=1000,
    random_state=42,
    solver="lbfgs",
)
model.fit(X_scaled, y)

# ── Evaluate ───────────────────────────────────────────────────────────────────
if len(states) >= 50:
    cv_scores = cross_val_score(model, X_scaled, y, cv=5, scoring="roc_auc")
    print(f"CV AUC:  {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
    train_auc = roc_auc_score(y, model.predict_proba(X_scaled)[:, 1])
    print(f"Train AUC: {train_auc:.4f}")
    print(f"Accuracy:  {(model.predict(X_scaled) == y).mean():.4f}")
else:
    print(f"Small dataset ({len(states)} states) — skipping CV, model trained on all data")
    print("  With full IPL dataset (280k states) expect AUC ~0.85-0.90")

# ── Serialize to JSON ──────────────────────────────────────────────────────────
model_data = {
    "features":       FEATURES,
    "coef":           model.coef_[0].tolist(),
    "intercept":      float(model.intercept_[0]),
    "scaler_mean":    scaler.mean_.tolist(),
    "scaler_scale":   scaler.scale_.tolist(),
    "classes":        model.classes_.tolist(),
    "n_training_samples": len(states),
    "train_accuracy": float((model.predict(X_scaled) == y).mean()),
    "feature_importance": dict(zip(FEATURES, np.abs(model.coef_[0]).tolist())),
}

out_path = DATA_DIR / "win_model.json"
with open(out_path, "w") as f:
    json.dump(model_data, f, indent=2)

print(f"\nModel saved → {out_path}")
print(f"Top features by |coefficient|:")
ranked = sorted(model_data["feature_importance"].items(), key=lambda x: -x[1])
for feat, imp in ranked[:6]:
    print(f"  {feat:25s}: {imp:.4f}")
