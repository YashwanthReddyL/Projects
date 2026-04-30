"""
routers/predict.py
==================
GET /predict/win          — single-point win probability for a game state
GET /predict/match/{id}   — full over-by-over win probability timeline for a match
GET /predict/model/info   — model metadata (features, importance, training size)
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from services.ml_service import predict_win_probability, get_model
from services.data_loader import get_store

router = APIRouter(prefix="/predict", tags=["predictions"])


@router.get("/win")
def get_win_probability(
    innings:        int   = Query(..., ge=1, le=2, description="1 = first innings, 2 = second innings"),
    over:           int   = Query(..., ge=0, le=19, description="Current over (0-indexed, so over 1 = 0)"),
    ball:           int   = Query(..., ge=0, le=6,  description="Ball within the over (0-6)"),
    runs_so_far:    int   = Query(..., ge=0),
    wickets_so_far: int   = Query(..., ge=0, le=10),
    target:         int   = Query(0, ge=0, description="First innings total + 1 (second innings only)"),
):
    """
    Predict win probability for the batting team at the given match state.
    Returns probability for both batting and bowling team.
    """
    model = get_model()
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Win probability model not available. Run pipeline/train_win_model.py first."
        )

    result = predict_win_probability(
        innings=innings,
        over=over,
        ball=ball,
        runs_so_far=runs_so_far,
        wickets_so_far=wickets_so_far,
        target=target,
    )
    return result


@router.get("/match/{match_id}")
def get_match_win_timeline(match_id: str):
    """
    Compute win probability at the end of every over for a completed match.
    Returns a list of timeline points, one per over per innings.
    Useful for a "how did the match swing" visualisation.
    """
    model = get_model()
    if model is None:
        raise HTTPException(status_code=503, detail="Model not available.")

    store = get_store()
    mdf   = store.matches[store.matches["match_id"] == match_id]
    if mdf.empty:
        raise HTTPException(status_code=404, detail=f"Match {match_id} not found")

    match     = mdf.iloc[0]
    ddf       = store.deliveries[
        (store.deliveries["match_id"] == match_id) &
        (store.deliveries["innings"].isin([1, 2]))
    ]
    if ddf.empty:
        raise HTTPException(status_code=404, detail="No delivery data for this match")

    # First innings total
    inn1_total = int(ddf[ddf["innings"] == 1]["runs_total"].sum())
    target     = inn1_total + 1

    team1 = match["team1"]
    team2 = match["team2"]
    winner = match["winner"]

    timeline = []

    for innings in [1, 2]:
        inn_df = ddf[ddf["innings"] == innings].copy()
        if inn_df.empty:
            continue

        batting_team = str(inn_df["batting_team"].iloc[0])
        bowling_team = str(inn_df["bowling_team"].iloc[0])

        runs       = 0
        wickets    = 0
        legal_balls = 0

        # Emit one point per over boundary
        prev_over = -1

        for _, row in inn_df.iterrows():
            is_legal = int(row["extras_wides"]) == 0
            if is_legal:
                legal_balls += 1

            runs    += int(row["runs_total"])
            wickets += int(row["is_wicket"])
            over     = int(row["over"])

            if over != prev_over:
                prev_over = over
                result = predict_win_probability(
                    innings=innings,
                    over=over,
                    ball=0,
                    runs_so_far=runs,
                    wickets_so_far=wickets,
                    target=target if innings == 2 else 0,
                )
                timeline.append({
                    "innings":           innings,
                    "over":              over,
                    "label":             f"Inn{innings} Ov{over+1}",
                    "batting_team":      batting_team,
                    "bowling_team":      bowling_team,
                    "runs_so_far":       runs,
                    "wickets_so_far":    wickets,
                    "batting_win_prob":  result["batting_win_prob"],
                    "bowling_win_prob":  result["bowling_win_prob"],
                    "crr":               result["context"]["crr"],
                    "rrr":               result["context"].get("rrr"),
                    "runs_required":     result["context"].get("runs_required"),
                })

    return {
        "match_id":    match_id,
        "team1":       team1,
        "team2":       team2,
        "winner":      winner,
        "inn1_total":  inn1_total,
        "target":      target,
        "timeline":    timeline,
    }


@router.get("/model/info")
def get_model_info():
    """Return metadata about the trained model."""
    model = get_model()
    if model is None:
        return {"available": False, "message": "Run pipeline/train_win_model.py to train the model."}

    importance_ranked = sorted(
        model.feature_importance.items(),
        key=lambda x: -x[1]
    )

    return {
        "available":       True,
        "n_training_samples": model.n_samples,
        "features":        model.features,
        "feature_importance": dict(importance_ranked),
        "model_type":      "Logistic Regression (L2)",
        "note": (
            "Model trained on all historical IPL deliveries. "
            "Win probability is for the current batting team. "
            "Accuracy improves significantly with the full 900+ match dataset."
        ),
    }
