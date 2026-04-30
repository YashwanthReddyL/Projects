"""
stats_engine.py
===============
All cricket stat aggregation logic. Routers call these — no pandas in routers.

Key fixes vs original:
  - Economy: bat_runs + wides + no-balls only (byes/legbyes NOT charged to bowler)
  - Average: -1.0 when divisor is 0 (caller renders as N/A)
  - Batting average: handles all-not-out correctly
  - Stats cached with functools.lru_cache keyed on (player, sorted match_ids tuple)
  - Regular innings only for career stats (super overs excluded)
  - Phase splits: powerplay (1-6), middle (7-15), death (16-20)
"""

import pandas as pd
import functools
from typing import Optional
from models.schemas import (
    BattingStats, BowlingStats, PlayerStats, FieldingStats,
    BatsmanLine, BowlerLine, OverSummary, Scorecard, Match,
    SuperOverInnings, SeasonBattingLine, SeasonBowlingLine,
    LeaderboardEntry, HeadToHeadStats, TeamHeadToHead,
    PartnershipRecord, VenueStats, PhaseSplit,
)

# ── Constants ──────────────────────────────────────────────────────────────────
# Wicket types that are NOT charged to the bowler
NON_BOWLER_WICKETS = {"run out", "retired hurt", "obstructing the field"}

# Phase boundaries (0-indexed overs)
POWERPLAY = (0, 5)    # overs 1-6
MIDDLE    = (6, 14)   # overs 7-15
DEATH     = (15, 19)  # overs 16-20


# ── Internal helpers ──────────────────────────────────────────────────────────

def _regular_innings(df: pd.DataFrame) -> pd.DataFrame:
    """Exclude super over deliveries from career stats."""
    return df[df["innings"] <= 2]


def _bowler_runs(df: pd.DataFrame) -> int:
    """
    Runs charged to the bowler: batsman runs + wides + no-balls.
    Byes and leg-byes are NOT charged to the bowler — they go to extras
    but the bowler is not penalised in economy/average calculations.
    """
    return int(
        df["runs_batsman"].sum() +
        df["extras_wides"].sum() +
        df["extras_noballs"].sum()
    )


def _innings_score(df: pd.DataFrame, player: str) -> pd.Series:
    """Per-innings runs scored by player."""
    bat = _regular_innings(df[df["batsman"] == player])
    return bat.groupby(["match_id", "innings"])["runs_batsman"].sum()


def _best_figures(df: pd.DataFrame) -> str:
    """Best bowling figures (W/R) across all innings."""
    best_w, best_r = 0, 9999
    for (_, _), grp in df.groupby(["match_id", "innings"]):
        w = int(grp[
            (grp["is_wicket"] == 1) &
            (~grp["wicket_kind"].isin(NON_BOWLER_WICKETS))
        ].shape[0])
        r = _bowler_runs(grp)
        if w > best_w or (w == best_w and r < best_r):
            best_w, best_r = w, r
    return f"{best_w}/{best_r}" if best_w > 0 else "0/-"


# ── Stats cache ────────────────────────────────────────────────────────────────
# Keyed on (player_name, sorted_match_ids_tuple).
# None match_ids = career (all matches).

@functools.lru_cache(maxsize=512)
def _cached_batting(player: str, match_ids_key: Optional[tuple]) -> BattingStats:
    """Internal — called via calc_batting_stats which resolves the cache key."""
    from services.data_loader import get_store
    store = get_store()
    df = store.deliveries
    if match_ids_key:
        df = df[df["match_id"].isin(match_ids_key)]
    return _compute_batting(player, df, store.matches)


@functools.lru_cache(maxsize=512)
def _cached_bowling(player: str, match_ids_key: Optional[tuple]) -> BowlingStats:
    from services.data_loader import get_store
    store = get_store()
    df = store.deliveries
    if match_ids_key:
        df = df[df["match_id"].isin(match_ids_key)]
    return _compute_bowling(player, df)


def _make_key(match_ids: Optional[list]) -> Optional[tuple]:
    return tuple(sorted(match_ids)) if match_ids else None


def calc_batting_stats(
    player: str,
    deliveries: pd.DataFrame,
    matches: pd.DataFrame,
    match_ids: Optional[list] = None,
) -> BattingStats:
    return _cached_batting(player, _make_key(match_ids))


def calc_bowling_stats(
    player: str,
    deliveries: pd.DataFrame,
    match_ids: Optional[list] = None,
) -> BowlingStats:
    return _cached_bowling(player, _make_key(match_ids))


def invalidate_stats_cache():
    """Call this if the DataStore is reloaded (e.g. after pipeline re-run)."""
    _cached_batting.cache_clear()
    _cached_bowling.cache_clear()


# ── Core computation ──────────────────────────────────────────────────────────

def _compute_batting(player: str, deliveries: pd.DataFrame, matches: pd.DataFrame) -> BattingStats:
    df = _regular_innings(deliveries[deliveries["batsman"] == player])
    if df.empty:
        return _empty_batting(player)

    # Balls faced: exclude wides (wides are not a legal delivery to the batsman)
    balls_faced = int(df[df["extras_wides"] == 0].shape[0])
    runs        = int(df["runs_batsman"].sum())

    # Innings played
    innings_groups  = df.groupby(["match_id", "innings"])
    innings_count   = len(innings_groups)

    # Dismissals (search full deliveries, not just batsman rows)
    all_dismissed = _regular_innings(
        deliveries[deliveries["player_dismissed"] == player]
    )
    dismissal_count = len(all_dismissed)
    not_outs        = innings_count - dismissal_count

    # Average: runs / dismissals. -1.0 if never dismissed (render as "N/A")
    average     = round(runs / dismissal_count, 2) if dismissal_count > 0 else -1.0
    strike_rate = round(runs / balls_faced * 100, 2) if balls_faced > 0 else 0.0

    fours = int(df[df["runs_batsman"] == 4].shape[0])
    sixes = int(df[df["runs_batsman"] == 6].shape[0])

    scores   = innings_groups["runs_batsman"].sum()
    fifties  = int(((scores >= 50) & (scores < 100)).sum())
    hundreds = int((scores >= 100).sum())
    highest  = int(scores.max()) if not scores.empty else 0

    # Ducks: dismissed for 0
    duck_outs = 0
    for (mid, inn), grp in innings_groups:
        if int(grp["runs_batsman"].sum()) == 0:
            was_out = all_dismissed[
                (all_dismissed["match_id"] == mid) &
                (all_dismissed["innings"]  == inn)
            ]
            if not was_out.empty:
                duck_outs += 1

    return BattingStats(
        player=player,
        matches=int(df["match_id"].nunique()),
        innings=innings_count,
        runs=runs,
        balls_faced=balls_faced,
        strike_rate=strike_rate,
        average=average,
        fours=fours,
        sixes=sixes,
        fifties=fifties,
        hundreds=hundreds,
        highest_score=highest,
        not_outs=not_outs,
        duck_outs=duck_outs,
    )


def _compute_bowling(player: str, deliveries: pd.DataFrame) -> BowlingStats:
    df = _regular_innings(deliveries[deliveries["bowler"] == player])
    if df.empty:
        return _empty_bowling(player)

    legal        = df[(df["extras_wides"] == 0) & (df["extras_noballs"] == 0)]
    balls_bowled = len(legal)
    overs        = round(balls_bowled / 6, 1)

    # Economy: only bat runs + wides + no-balls (NOT byes or leg-byes)
    runs_conceded = _bowler_runs(df)

    wickets_df = df[
        (df["is_wicket"] == 1) &
        (~df["wicket_kind"].isin(NON_BOWLER_WICKETS))
    ]
    wickets = len(wickets_df)

    economy   = round(runs_conceded / overs, 2)   if overs    > 0 else 0.0
    average   = round(runs_conceded / wickets, 2) if wickets  > 0 else -1.0
    dot_balls = int((legal["runs_total"] == 0).sum())

    return BowlingStats(
        player=player,
        matches=int(df["match_id"].nunique()),
        innings=df.groupby(["match_id", "innings"]).ngroups,
        overs=overs,
        balls_bowled=balls_bowled,
        runs_conceded=runs_conceded,
        wickets=wickets,
        economy=economy,
        average=average,
        best_figures=_best_figures(df),
        dot_balls=dot_balls,
        wides=int(df["extras_wides"].sum()),
        no_balls=int(df["extras_noballs"].sum()),
    )


def _empty_batting(player: str) -> BattingStats:
    return BattingStats(
        player=player, matches=0, innings=0, runs=0, balls_faced=0,
        strike_rate=0.0, average=-1.0, fours=0, sixes=0,
        fifties=0, hundreds=0, highest_score=0, not_outs=0, duck_outs=0,
    )


def _empty_bowling(player: str) -> BowlingStats:
    return BowlingStats(
        player=player, matches=0, innings=0, overs=0.0, balls_bowled=0,
        runs_conceded=0, wickets=0, economy=0.0, average=-1.0,
        best_figures="0/-", dot_balls=0, wides=0, no_balls=0,
    )


# ── Season breakdown ──────────────────────────────────────────────────────────

def calc_season_batting(player: str, deliveries: pd.DataFrame, matches: pd.DataFrame) -> list[SeasonBattingLine]:
    df = _regular_innings(deliveries[deliveries["batsman"] == player])
    if df.empty:
        return []

    lines = []
    for season, grp in df.groupby("season"):
        mids = grp["match_id"].unique().tolist()
        b = _compute_batting(player, grp, matches)
        lines.append(SeasonBattingLine(
            season=str(season),
            matches=b.matches,
            innings=b.innings,
            runs=b.runs,
            average=b.average,
            strike_rate=b.strike_rate,
            fifties=b.fifties,
            hundreds=b.hundreds,
        ))
    return sorted(lines, key=lambda x: x.season)


def calc_season_bowling(player: str, deliveries: pd.DataFrame) -> list[SeasonBowlingLine]:
    df = _regular_innings(deliveries[deliveries["bowler"] == player])
    if df.empty:
        return []

    lines = []
    for season, grp in df.groupby("season"):
        b = _compute_bowling(player, grp)
        lines.append(SeasonBowlingLine(
            season=str(season),
            matches=b.matches,
            innings=b.innings,
            wickets=b.wickets,
            economy=b.economy,
            average=b.average,
            best_figures=b.best_figures,
        ))
    return sorted(lines, key=lambda x: x.season)


# ── Full player stats ─────────────────────────────────────────────────────────

def calc_fielding_stats(player: str, deliveries: pd.DataFrame) -> FieldingStats:
    """Catches, run-outs, stumpings from delivery data."""
    df = _regular_innings(deliveries)
    wickets = df[df["is_wicket"] == 1]

    catches   = int(wickets[
        (wickets["wicket_kind"] == "caught") &
        ((wickets["fielder1"] == player) | (wickets["fielder2"] == player))
    ].shape[0])

    run_outs  = int(wickets[
        (wickets["wicket_kind"] == "run out") &
        ((wickets["fielder1"] == player) | (wickets["fielder2"] == player))
    ].shape[0])

    stumpings = int(wickets[
        (wickets["wicket_kind"] == "stumped") &
        (wickets["fielder1"] == player)
    ].shape[0])

    return FieldingStats(
        catches=catches,
        run_outs=run_outs,
        stumpings=stumpings,
        total=catches + run_outs + stumpings,
    )


def calc_player_stats(
    player: str,
    deliveries: pd.DataFrame,
    matches: pd.DataFrame,
    match_ids: Optional[list] = None,
    player_index: Optional[dict] = None,
) -> PlayerStats:
    batting  = calc_batting_stats(player, deliveries, matches, match_ids)
    bowling  = calc_bowling_stats(player, deliveries, match_ids)
    fielding = calc_fielding_stats(player, deliveries)

    import re
    pom = int(matches["player_of_match"].str.contains(
        rf"(?:^|;)\s*{re.escape(player)}\s*(?:;|$)", regex=True, na=False
    ).sum())

    season_bat = calc_season_batting(player, deliveries, matches)
    season_bwl = calc_season_bowling(player, deliveries)

    # Matches where player had any delivery involvement
    df = _regular_innings(deliveries)
    bat_match_ids  = set(df[df["batsman"]  == player]["match_id"].unique())
    bowl_match_ids = set(df[df["bowler"]   == player]["match_id"].unique())
    non_striker_ids = set(df[df["non_striker"] == player]["match_id"].unique())
    field_ids = set(df[
        (df["is_wicket"] == 1) &
        ((df["fielder1"] == player) | (df["fielder2"] == player))
    ]["match_id"].unique())
    all_involved = bat_match_ids | bowl_match_ids | non_striker_ids | field_ids

    matches_batted  = len(bat_match_ids)
    matches_bowled  = len(bowl_match_ids)
    matches_played  = len(all_involved)

    # Matches in squad (from player_index — includes DNB matches)
    if player_index and player in player_index:
        squad_ids = set(player_index[player].get("match_ids", []))
        if match_ids:
            squad_ids = squad_ids & set(match_ids)
        matches_in_squad = len(squad_ids)
    else:
        matches_in_squad = matches_played  # fallback

    # DNB = in squad but never faced a ball as batsman
    dnb_count = max(0, matches_in_squad - matches_batted)

    return PlayerStats(
        player=player,
        batting=batting,
        bowling=bowling,
        fielding=fielding,
        matches_played=matches_played,
        matches_in_squad=matches_in_squad,
        matches_batted=matches_batted,
        matches_bowled=matches_bowled,
        dnb_count=dnb_count,
        player_of_match_count=pom,
        season_batting=season_bat,
        season_bowling=season_bwl,
    )


# ── Leaderboard ───────────────────────────────────────────────────────────────

def calc_leaderboard(
    metric: str,
    deliveries: pd.DataFrame,
    matches: pd.DataFrame,
    season: Optional[str] = None,
    min_innings: int = 10,
    top_n: int = 20,
) -> list[LeaderboardEntry]:
    """
    metric: "runs" | "wickets" | "strike_rate" | "average" | "economy" | "sixes"
    """
    df = _regular_innings(deliveries)
    if season:
        df = df[df["season"] == season]

    if metric in ("runs", "strike_rate", "average", "sixes"):
        return _batting_leaderboard(metric, df, matches, min_innings, top_n)
    else:
        return _bowling_leaderboard(metric, df, min_innings, top_n)


def _batting_leaderboard(metric, df, matches, min_innings, top_n):
    bat = df[df["extras_wides"] == 0]  # legal balls only for SR
    grouped = df.groupby("batsman")

    rows = []
    for player, grp in grouped:
        innings_count = grp.groupby(["match_id", "innings"]).ngroups
        if innings_count < min_innings:
            continue
        runs        = int(grp["runs_batsman"].sum())
        balls       = int(grp[grp["extras_wides"] == 0].shape[0])
        sixes       = int(grp[grp["runs_batsman"] == 6].shape[0])
        dismissed   = int(df[df["player_dismissed"] == player].shape[0])
        sr          = round(runs / balls * 100, 2) if balls > 0 else 0.0
        avg         = round(runs / dismissed, 2) if dismissed > 0 else -1.0

        if metric == "runs":
            value = float(runs)
            secondary = f"{innings_count} inns"
        elif metric == "strike_rate":
            value = sr
            secondary = f"{runs} runs"
        elif metric == "average":
            if avg < 0:
                continue
            value = avg
            secondary = f"{runs} runs"
        elif metric == "sixes":
            value = float(sixes)
            secondary = f"{runs} runs"
        else:
            continue

        rows.append((value, player, innings_count, secondary))

    rows.sort(key=lambda x: -x[0])
    return [
        LeaderboardEntry(rank=i+1, player=p, value=v, matches=inn, secondary=sec)
        for i, (v, p, inn, sec) in enumerate(rows[:top_n])
    ]


def _bowling_leaderboard(metric, df, min_innings, top_n):
    grouped = df.groupby("bowler")
    rows = []
    for player, grp in grouped:
        innings_count = grp.groupby(["match_id", "innings"]).ngroups
        if innings_count < min_innings:
            continue
        legal   = grp[(grp["extras_wides"] == 0) & (grp["extras_noballs"] == 0)]
        balls   = len(legal)
        overs   = balls / 6
        runs    = _bowler_runs(grp)
        wkts    = int(grp[
            (grp["is_wicket"] == 1) &
            (~grp["wicket_kind"].isin(NON_BOWLER_WICKETS))
        ].shape[0])
        eco     = round(runs / overs, 2) if overs > 0 else 0.0
        avg     = round(runs / wkts, 2) if wkts > 0 else -1.0

        if metric == "wickets":
            value = float(wkts)
            secondary = f"{round(overs,1)} ov"
        elif metric == "economy":
            if overs < 10:
                continue
            value = eco
            secondary = f"{wkts} wkts"
        else:
            continue

        rows.append((value, player, innings_count, secondary))

    # economy: lower is better
    reverse = metric != "economy"
    rows.sort(key=lambda x: x[0], reverse=reverse)
    return [
        LeaderboardEntry(rank=i+1, player=p, value=v, matches=inn, secondary=sec)
        for i, (v, p, inn, sec) in enumerate(rows[:top_n])
    ]


# ── Head-to-head: batsman vs bowler ──────────────────────────────────────────

def calc_h2h_player(
    batsman: str,
    bowler: str,
    deliveries: pd.DataFrame,
) -> HeadToHeadStats:
    df = _regular_innings(
        deliveries[
            (deliveries["batsman"] == batsman) &
            (deliveries["bowler"]  == bowler)
        ]
    )
    if df.empty:
        return HeadToHeadStats(
            batsman=batsman, bowler=bowler, balls=0, runs=0,
            dismissals=0, strike_rate=0.0, dot_ball_pct=0.0
        )

    legal      = df[df["extras_wides"] == 0]
    balls      = len(legal)
    runs       = int(df["runs_batsman"].sum())
    dismissals = int(df[
        (df["is_wicket"] == 1) &
        (df["player_dismissed"] == batsman) &
        (~df["wicket_kind"].isin(NON_BOWLER_WICKETS))
    ].shape[0])
    sr         = round(runs / balls * 100, 2) if balls > 0 else 0.0
    dots       = int((legal["runs_batsman"] == 0).sum())
    dot_pct    = round(dots / balls * 100, 2) if balls > 0 else 0.0

    return HeadToHeadStats(
        batsman=batsman, bowler=bowler, balls=balls, runs=runs,
        dismissals=dismissals, strike_rate=sr, dot_ball_pct=dot_pct,
    )


# ── Head-to-head: team vs team ────────────────────────────────────────────────

def calc_h2h_team(
    team1: str,
    team2: str,
    matches: pd.DataFrame,
) -> TeamHeadToHead:
    df = matches[
        ((matches["team1"] == team1) & (matches["team2"] == team2)) |
        ((matches["team1"] == team2) & (matches["team2"] == team1))
    ].sort_values("date", ascending=False)

    total       = len(df)
    t1_wins     = int((df["winner"] == team1).sum())
    t2_wins     = int((df["winner"] == team2).sum())
    no_result   = total - t1_wins - t2_wins
    last_5      = df["winner"].head(5).fillna("No result").tolist()

    return TeamHeadToHead(
        team1=team1, team2=team2,
        matches=total, team1_wins=t1_wins, team2_wins=t2_wins,
        no_result=no_result, last_5=last_5,
    )


# ── Partnership stats ─────────────────────────────────────────────────────────

def calc_partnerships(
    match_id: str,
    deliveries: pd.DataFrame,
    innings: int = 1,
) -> list[PartnershipRecord]:
    """Calculate all batting partnerships for one innings of one match."""
    df = _regular_innings(
        deliveries[
            (deliveries["match_id"] == match_id) &
            (deliveries["innings"]  == innings)
        ]
    ).sort_values(["over", "ball"])

    if df.empty:
        return []

    records = []
    current_pair  = None
    pair_runs     = 0
    pair_balls    = 0
    wicket_num    = 0
    date = df["date"].iloc[0] if "date" in df.columns else ""
    team = df["batting_team"].iloc[0]

    for _, row in df.iterrows():
        bat   = row["batsman"]
        non   = row["non_striker"]
        pair  = tuple(sorted([bat, non]))

        if current_pair is None:
            current_pair = pair

        if pair != current_pair:
            # Partnership broke — record it
            records.append(PartnershipRecord(
                batsman1=current_pair[0], batsman2=current_pair[1],
                runs=pair_runs, balls=pair_balls,
                match_id=match_id, date=str(date),
                for_team=team, wicket=wicket_num + 1,
            ))
            wicket_num   += 1
            current_pair  = pair
            pair_runs     = 0
            pair_balls    = 0

        pair_runs  += int(row["runs_batsman"]) + int(row["extras_legbyes"]) + int(row["extras_byes"])
        if row["extras_wides"] == 0:
            pair_balls += 1

    # Last partnership
    if current_pair is not None:
        records.append(PartnershipRecord(
            batsman1=current_pair[0], batsman2=current_pair[1],
            runs=pair_runs, balls=pair_balls,
            match_id=match_id, date=str(date),
            for_team=team, wicket=wicket_num + 1,
        ))

    return records


# ── Venue stats ───────────────────────────────────────────────────────────────

def calc_venue_stats(
    venue: str,
    deliveries: pd.DataFrame,
    matches: pd.DataFrame,
) -> VenueStats:
    vm = matches[matches["venue"] == venue]
    if vm.empty:
        return VenueStats(
            venue=venue, city="", matches=0,
            avg_first_innings_score=0.0, avg_second_innings_score=0.0,
            bat_first_wins=0, field_first_wins=0,
            highest_total=0, lowest_total=999,
        )

    city = vm["city"].iloc[0] if "city" in vm.columns else ""
    mids = vm["match_id"].tolist()
    vd   = _regular_innings(deliveries[deliveries["match_id"].isin(mids)])

    inn_totals = vd.groupby(["match_id", "innings"])["runs_total"].sum().reset_index()
    inn1 = inn_totals[inn_totals["innings"] == 1]["runs_total"]
    inn2 = inn_totals[inn_totals["innings"] == 2]["runs_total"]

    bat_first_wins   = int(vm[
        (vm["toss_decision"] == "bat") & (vm["toss_winner"] == vm["winner"])
    ].shape[0]) + int(vm[
        (vm["toss_decision"] == "field") & (vm["toss_winner"] != vm["winner"])
    ].shape[0])
    field_first_wins = len(vm) - bat_first_wins

    return VenueStats(
        venue=venue,
        city=str(city),
        matches=len(vm),
        avg_first_innings_score=round(float(inn1.mean()), 1) if not inn1.empty else 0.0,
        avg_second_innings_score=round(float(inn2.mean()), 1) if not inn2.empty else 0.0,
        bat_first_wins=bat_first_wins,
        field_first_wins=field_first_wins,
        highest_total=int(inn1.max()) if not inn1.empty else 0,
        lowest_total=int(inn1.min()) if not inn1.empty else 0,
    )


# ── Phase splits ──────────────────────────────────────────────────────────────

def calc_phase_splits(match_id: str, deliveries: pd.DataFrame) -> list[PhaseSplit]:
    df = _regular_innings(deliveries[deliveries["match_id"] == match_id])
    if df.empty:
        return []

    phases = [
        ("powerplay", "1-6",   POWERPLAY),
        ("middle",    "7-15",  MIDDLE),
        ("death",     "16-20", DEATH),
    ]
    result = []
    for innings in [1, 2]:
        inn_df = df[df["innings"] == innings]
        for name, overs_label, (start, end) in phases:
            phase_df = inn_df[(inn_df["over"] >= start) & (inn_df["over"] <= end)]
            legal    = phase_df[phase_df["extras_wides"] == 0]
            balls    = len(legal)
            runs     = int(phase_df["runs_total"].sum())
            wickets  = int(phase_df["is_wicket"].sum())
            rr       = round(runs / (balls / 6), 2) if balls >= 6 else 0.0
            result.append(PhaseSplit(
                phase=f"{name}_inn{innings}",
                overs=overs_label,
                runs=runs, wickets=wickets,
                balls=balls, run_rate=rr,
            ))
    return result


# ── Scorecard ─────────────────────────────────────────────────────────────────

def build_scorecard(match_id: str, deliveries: pd.DataFrame, matches: pd.DataFrame) -> Scorecard:
    md = matches[matches["match_id"] == match_id]
    if md.empty:
        raise ValueError(f"Match {match_id} not found")

    match_row = md.iloc[0]
    match = Match(**{col: match_row[col] for col in match_row.index})
    df    = deliveries[deliveries["match_id"] == match_id].copy()

    innings1_batting, innings1_bowling = _build_innings_cards(df, 1)
    innings2_batting, innings2_bowling = _build_innings_cards(df, 2)
    inn1 = df[df["innings"] == 1]
    inn2 = df[df["innings"] == 2]

    super_over_nums = sorted(df[df["innings"] >= 3]["innings"].unique().tolist())
    super_overs = []
    for inn_num in super_over_nums:
        batting, bowling = _build_innings_cards(df, inn_num)
        inn_df = df[df["innings"] == inn_num]
        team   = inn_df["batting_team"].iloc[0] if not inn_df.empty else ""
        super_overs.append(SuperOverInnings(
            innings=inn_num, team=team,
            total=int(inn_df["runs_total"].sum()),
            wickets=int(inn_df["is_wicket"].sum()),
            batting=batting, bowling=bowling,
        ))

    return Scorecard(
        match_id=match_id,
        match=match,
        innings1_batting=innings1_batting,
        innings1_bowling=innings1_bowling,
        innings1_total=int(inn1["runs_total"].sum()),
        innings1_wickets=int(inn1["is_wicket"].sum()),
        innings2_batting=innings2_batting,
        innings2_bowling=innings2_bowling,
        innings2_total=int(inn2["runs_total"].sum()),
        innings2_wickets=int(inn2["is_wicket"].sum()),
        super_overs=super_overs,
        over_by_over=_build_over_summaries(df),
        phase_splits=calc_phase_splits(match_id, deliveries),
    )


def _build_innings_cards(df: pd.DataFrame, innings: int):
    inn = df[df["innings"] == innings]
    batting_lines = []
    seen = set()

    for _, row in inn.iterrows():
        batter = row["batsman"]
        if batter in seen:
            continue
        seen.add(batter)
        b_df   = inn[inn["batsman"] == batter]
        balls  = int(b_df[b_df["extras_wides"] == 0].shape[0])
        runs   = int(b_df["runs_batsman"].sum())
        fours  = int(b_df[b_df["runs_batsman"] == 4].shape[0])
        sixes  = int(b_df[b_df["runs_batsman"] == 6].shape[0])
        sr     = round(runs / balls * 100, 1) if balls > 0 else 0.0

        w_row  = inn[(inn["player_dismissed"] == batter) & (inn["is_wicket"] == 1)]
        if not w_row.empty:
            wr   = w_row.iloc[0]
            kind = wr["wicket_kind"]
            f1   = wr["fielder1"]
            blr  = wr["bowler"]
            if kind == "caught":
                dismissal = f"c {f1} b {blr}"
            elif kind == "bowled":
                dismissal = f"b {blr}"
            elif kind == "lbw":
                dismissal = f"lbw b {blr}"
            elif kind == "stumped":
                dismissal = f"st {f1} b {blr}"
            elif kind == "run out":
                dismissal = f"run out ({f1})"
            else:
                dismissal = kind
        else:
            dismissal = "not out"

        batting_lines.append(BatsmanLine(
            batsman=batter, runs=runs, balls=balls, fours=fours,
            sixes=sixes, strike_rate=sr, dismissal=dismissal, innings=innings,
        ))

    bowling_lines = []
    for bowler, grp in inn.groupby("bowler"):
        legal  = grp[(grp["extras_wides"] == 0) & (grp["extras_noballs"] == 0)]
        balls  = len(legal)
        overs  = round(balls / 6, 1)
        runs   = _bowler_runs(grp)
        wkts   = int(grp[
            (grp["is_wicket"] == 1) &
            (~grp["wicket_kind"].isin(NON_BOWLER_WICKETS))
        ].shape[0])
        eco    = round(runs / overs, 2) if overs > 0 else 0.0
        bowling_lines.append(BowlerLine(
            bowler=bowler, overs=overs, runs=runs, wickets=wkts,
            economy=eco, wides=int(grp["extras_wides"].sum()),
            no_balls=int(grp["extras_noballs"].sum()), innings=innings,
        ))

    return batting_lines, bowling_lines


def _build_over_summaries(df: pd.DataFrame) -> list[OverSummary]:
    summaries  = []
    cumulative = 0
    for (innings, over), grp in df.groupby(["innings", "over"]):
        runs      = int(grp["runs_total"].sum())
        cumulative += runs
        summaries.append(OverSummary(
            over=int(over) + (int(innings) - 1) * 20,
            runs=runs,
            wickets=int(grp["is_wicket"].sum()),
            extras=int(grp["runs_extras"].sum()),
            cumulative_runs=cumulative,
        ))
    return summaries
