"""
routers/deliveries.py
=====================
GET /deliveries         — raw deliveries with filters
GET /deliveries/overs   — over-by-over summary for a match
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from services.data_loader import get_store
from models.schemas import Delivery, OverSummary

router = APIRouter(prefix="/deliveries", tags=["deliveries"])


@router.get("", response_model=list[Delivery])
def get_deliveries(
    match_id: str           = Query(..., description="Required: match ID"),
    innings:  Optional[int] = Query(None, ge=1, le=4,
                                    description="1=first innings, 2=second innings, 3/4=Super Over"),
    bowler:   Optional[str] = Query(None),
    batsman:  Optional[str] = Query(None),
):
    store = get_store()
    df = store.deliveries[store.deliveries["match_id"] == match_id].copy()

    if df.empty:
        raise HTTPException(status_code=404, detail=f"No deliveries for match {match_id}")

    if innings:
        df = df[df["innings"] == innings]
    if bowler:
        df = df[df["bowler"] == bowler]
    if batsman:
        df = df[df["batsman"] == batsman]

    return df.fillna("").to_dict(orient="records")


@router.get("/overs", response_model=list[OverSummary])
def get_over_summary(
    match_id: str           = Query(...),
    innings:  Optional[int] = Query(None, ge=1, le=4,
                                    description="1=first innings, 2=second innings, 3/4=Super Over"),
):
    store = get_store()
    df = store.deliveries[store.deliveries["match_id"] == match_id].copy()

    if df.empty:
        raise HTTPException(status_code=404, detail=f"No deliveries for match {match_id}")

    if innings:
        df = df[df["innings"] == innings]

    summaries = []
    cumulative = 0
    for (inn, over), grp in df.groupby(["innings", "over"]):
        runs    = int(grp["runs_total"].sum())
        wickets = int(grp["is_wicket"].sum())
        extras  = int(grp["runs_extras"].sum())
        cumulative += runs
        summaries.append(OverSummary(
            over=int(over) + (int(inn) - 1) * 20,
            runs=runs,
            wickets=wickets,
            extras=extras,
            cumulative_runs=cumulative,
        ))
    return summaries
