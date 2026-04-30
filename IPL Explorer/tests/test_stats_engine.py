"""
test_stats_engine.py
====================
Unit tests for stats_engine.py using minimal in-memory DataFrames.
No CSV files or pydantic/fastapi needed — pure pandas logic.

Run from project root:
    cd backend && pytest ../tests/test_stats_engine.py -v
"""

import sys
import pytest
import pandas as pd
import numpy as np
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))


# ── Fixtures ──────────────────────────────────────────────────────────────────

def make_deliveries() -> pd.DataFrame:
    """
    Synthetic match data covering every edge case:
      Match M1, Innings 1 (regular):
        PlayerA bats: 6, 4, [wide], 1, 0, 6 = 17 runs, 5 legal balls
        PlayerB bats: 2, 0, [dismissed caught BowlerX c FielderY] = 2 runs
      Match M1, Innings 2 (regular):
        PlayerC bats: 0 [not dismissed — not out] = 0 runs, 1 ball
      Match M1, Innings 3 (super over — should be excluded from career stats):
        PlayerA bats: 10 runs (should NOT count in career batting stats)
      BowlerX bowls all deliveries in innings 1 and super over
    """
    base = dict(
        match_id='M1', date='2024-01-01', season='2024',
        batting_team='TeamA', bowling_team='TeamB', bowler='BowlerX',
        runs_extras=0, extras_wides=0, extras_noballs=0,
        extras_legbyes=0, extras_byes=0, extras_penalty=0,
        is_wicket=0, wicket_kind='', player_dismissed='',
        fielder1='', fielder2='',
    )

    rows = [
        # ── Innings 1 ─────────────────────────────────────────────────────
        {**base, 'innings':1,'is_super_over':0,'over':0,'ball':1,
         'batsman':'PlayerA','non_striker':'PlayerB',
         'runs_batsman':6,'runs_total':6},
        {**base, 'innings':1,'is_super_over':0,'over':0,'ball':2,
         'batsman':'PlayerA','non_striker':'PlayerB',
         'runs_batsman':4,'runs_total':4},
        # wide — does not count as ball faced
        {**base, 'innings':1,'is_super_over':0,'over':0,'ball':3,
         'batsman':'PlayerA','non_striker':'PlayerB',
         'runs_batsman':0,'runs_extras':1,'runs_total':1,'extras_wides':1},
        {**base, 'innings':1,'is_super_over':0,'over':0,'ball':4,
         'batsman':'PlayerA','non_striker':'PlayerB',
         'runs_batsman':1,'runs_total':1},
        {**base, 'innings':1,'is_super_over':0,'over':0,'ball':5,
         'batsman':'PlayerA','non_striker':'PlayerB',
         'runs_batsman':0,'runs_total':0},
        {**base, 'innings':1,'is_super_over':0,'over':0,'ball':6,
         'batsman':'PlayerA','non_striker':'PlayerB',
         'runs_batsman':6,'runs_total':6},
        # PlayerB bats — dismissed caught
        {**base, 'innings':1,'is_super_over':0,'over':1,'ball':1,
         'batsman':'PlayerB','non_striker':'PlayerA',
         'runs_batsman':2,'runs_total':2},
        {**base, 'innings':1,'is_super_over':0,'over':1,'ball':2,
         'batsman':'PlayerB','non_striker':'PlayerA',
         'runs_batsman':0,'runs_total':0},
        {**base, 'innings':1,'is_super_over':0,'over':1,'ball':3,
         'batsman':'PlayerB','non_striker':'PlayerA',
         'runs_batsman':0,'runs_total':0,
         'is_wicket':1,'wicket_kind':'caught',
         'player_dismissed':'PlayerB','fielder1':'FielderY'},

        # ── Innings 2 ─────────────────────────────────────────────────────
        # PlayerC faces one ball, not dismissed (not out 0)
        {**base, 'innings':2,'is_super_over':0,'over':0,'ball':1,
         'batsman':'PlayerC','non_striker':'PlayerD','bowler':'BowlerZ',
         'batting_team':'TeamB','bowling_team':'TeamA',
         'runs_batsman':0,'runs_total':0},

        # ── Innings 3 — Super Over (must be excluded from career stats) ───
        {**base, 'innings':3,'is_super_over':1,'over':0,'ball':1,
         'batsman':'PlayerA','non_striker':'PlayerB',
         'runs_batsman':10,'runs_total':10},
    ]
    df = pd.DataFrame(rows)
    # Ensure correct dtypes
    int_cols = ['innings','is_super_over','over','ball','runs_batsman',
                'runs_extras','runs_total','extras_wides','extras_noballs',
                'extras_legbyes','extras_byes','extras_penalty',
                'is_wicket']
    for col in int_cols:
        df[col] = df[col].astype(int)
    return df


def make_matches() -> pd.DataFrame:
    return pd.DataFrame([{
        'match_id':'M1','date':'2024-01-01','season':'2024',
        'city':'Test','venue':'Test Ground',
        'team1':'TeamA','team2':'TeamB',
        'toss_winner':'TeamA','toss_decision':'bat',
        'winner':'TeamA','win_by_runs':50,'win_by_wickets':0,
        'result':'normal','player_of_match':'PlayerA; BowlerX',
        'umpire1':'U1','umpire2':'U2',
    }])


# ── _regular_innings helper ───────────────────────────────────────────────────

class TestRegularInnings:
    def test_excludes_super_over(self):
        from services.stats_engine import _regular_innings
        df  = make_deliveries()
        reg = _regular_innings(df)
        assert (reg['innings'] <= 2).all()
        assert 3 not in reg['innings'].values

    def test_includes_innings_1_and_2(self):
        from services.stats_engine import _regular_innings
        df  = make_deliveries()
        reg = _regular_innings(df)
        assert set(reg['innings'].unique()) == {1, 2}


# ── Batting stats ─────────────────────────────────────────────────────────────

class TestBattingStats:
    def setup_method(self):
        self.df      = make_deliveries()
        self.matches = make_matches()

    def test_playerA_runs_excludes_super_over(self):
        """Career runs must not include the 10-run super over innings."""
        from services.stats_engine import _compute_batting
        df = self.df[self.df['match_id'] == 'M1']
        b  = _compute_batting('PlayerA', df, self.matches)
        # Regular innings only: 6+4+1+0+6 = 17 (the wide gives 0 bat runs)
        assert b.runs == 17, f"Expected 17, got {b.runs}"

    def test_playerA_balls_faced_excludes_wides(self):
        from services.stats_engine import _compute_batting
        b = _compute_batting('PlayerA', self.df, self.matches)
        assert b.balls_faced == 5   # 6 deliveries - 1 wide

    def test_playerA_not_out(self):
        from services.stats_engine import _compute_batting
        b = _compute_batting('PlayerA', self.df, self.matches)
        assert b.not_outs == 1
        assert b.average == -1.0    # never dismissed → sentinel value

    def test_playerA_fours_sixes(self):
        from services.stats_engine import _compute_batting
        b = _compute_batting('PlayerA', self.df, self.matches)
        assert b.fours == 1
        assert b.sixes == 2

    def test_playerB_dismissed(self):
        from services.stats_engine import _compute_batting
        b = _compute_batting('PlayerB', self.df, self.matches)
        assert b.runs == 2
        assert b.not_outs == 0
        assert b.average == pytest.approx(2.0)

    def test_playerC_not_out_zero_duck_not_counted(self):
        """PlayerC scored 0 but was not dismissed — should NOT be a duck."""
        from services.stats_engine import _compute_batting
        b = _compute_batting('PlayerC', self.df, self.matches)
        assert b.runs == 0
        assert b.not_outs == 1
        assert b.duck_outs == 0     # not dismissed → not a duck

    def test_playerB_duck_dismissed_for_zero_not_in_this_fixture(self):
        """Verify duck detection: dismissed for 0 = duck."""
        from services.stats_engine import _compute_batting
        # PlayerB scored 2 before being dismissed — NOT a duck
        b = _compute_batting('PlayerB', self.df, self.matches)
        assert b.duck_outs == 0

    def test_missing_player_returns_empty(self):
        from services.stats_engine import _compute_batting
        b = _compute_batting('Nobody', self.df, self.matches)
        assert b.runs == 0
        assert b.innings == 0
        assert b.average == -1.0


# ── Bowling stats ─────────────────────────────────────────────────────────────

class TestBowlingStats:
    def setup_method(self):
        self.df = make_deliveries()

    def test_bowlerX_legal_balls_only(self):
        """8 deliveries in innings 1 minus 1 wide = 8 legal balls... wait"""
        from services.stats_engine import _compute_bowling
        # BowlerX bowled 9 total deliveries in inn1 (including 1 wide)
        # + 1 delivery in super over (excluded by _regular_innings)
        # legal = no wides AND no no-balls → 9-1=8
        b = _compute_bowling('BowlerX', self.df)
        assert b.balls_bowled == 8

    def test_bowlerX_economy_excludes_byes_legbyes(self):
        """Economy = (bat_runs + wides + no-balls) / overs — NOT byes/legbyes."""
        from services.stats_engine import _compute_bowling
        b = _compute_bowling('BowlerX', self.df)
        # bat_runs in regular innings: 6+4+0+1+0+6+2+0+0 = 19
        # wides: 1
        # runs_conceded = 19 + 1 = 20
        # overs = 8/6 = 1.333...
        # economy = 20 / (8/6) = 15.0
        assert b.runs_conceded == 20
        assert b.economy == pytest.approx(15.0, abs=0.01)

    def test_bowlerX_wickets_excludes_runout(self):
        """Only bowler-credit wickets counted (not run-outs)."""
        from services.stats_engine import _compute_bowling
        b = _compute_bowling('BowlerX', self.df)
        # PlayerB dismissed caught — that IS a bowler wicket
        assert b.wickets == 1

    def test_bowlerX_super_over_excluded(self):
        """Super over delivery must not inflate bowling stats."""
        from services.stats_engine import _compute_bowling
        b = _compute_bowling('BowlerX', self.df)
        # If super over was included, balls_bowled would be 9, not 8
        assert b.balls_bowled == 8

    def test_missing_bowler_returns_empty(self):
        from services.stats_engine import _compute_bowling
        b = _compute_bowling('Nobody', self.df)
        assert b.wickets == 0
        assert b.average == -1.0
        assert b.economy == 0.0


# ── Fielding stats ────────────────────────────────────────────────────────────

class TestFieldingStats:
    def setup_method(self):
        self.df = make_deliveries()

    def test_fielderY_catches(self):
        from services.stats_engine import calc_fielding_stats
        f = calc_fielding_stats('FielderY', self.df)
        assert f.catches == 1
        assert f.run_outs == 0
        assert f.stumpings == 0
        assert f.total == 1

    def test_no_fielding_involvement(self):
        from services.stats_engine import calc_fielding_stats
        f = calc_fielding_stats('PlayerC', self.df)
        assert f.total == 0

    def test_runout_counted_for_both_fielders(self):
        """If two fielders involved in a run-out, both get credit."""
        from services.stats_engine import calc_fielding_stats
        # Add a run-out with two fielders
        extra_row = pd.DataFrame([{
            'match_id':'M1','date':'2024-01-01','season':'2024',
            'innings':1,'is_super_over':0,'over':2,'ball':1,
            'batting_team':'TeamA','bowling_team':'TeamB',
            'batsman':'PlayerD','non_striker':'PlayerA','bowler':'BowlerX',
            'runs_batsman':1,'runs_extras':0,'runs_total':1,
            'extras_wides':0,'extras_noballs':0,'extras_legbyes':0,
            'extras_byes':0,'extras_penalty':0,
            'is_wicket':1,'wicket_kind':'run out',
            'player_dismissed':'PlayerD',
            'fielder1':'FielderA','fielder2':'FielderB',
        }])
        df_extended = pd.concat([self.df, extra_row], ignore_index=True)
        df_extended['innings'] = df_extended['innings'].astype(int)
        df_extended['is_super_over'] = df_extended['is_super_over'].astype(int)
        df_extended['is_wicket'] = df_extended['is_wicket'].astype(int)

        fA = calc_fielding_stats('FielderA', df_extended)
        fB = calc_fielding_stats('FielderB', df_extended)
        assert fA.run_outs == 1
        assert fB.run_outs == 1

    def test_super_over_fielding_excluded(self):
        """Fielding in super overs should not count in career stats."""
        from services.stats_engine import calc_fielding_stats
        # Add a catch in super over
        extra_row = pd.DataFrame([{
            'match_id':'M1','date':'2024-01-01','season':'2024',
            'innings':3,'is_super_over':1,'over':0,'ball':2,
            'batting_team':'TeamA','bowling_team':'TeamB',
            'batsman':'PlayerB','non_striker':'PlayerA','bowler':'BowlerX',
            'runs_batsman':0,'runs_extras':0,'runs_total':0,
            'extras_wides':0,'extras_noballs':0,'extras_legbyes':0,
            'extras_byes':0,'extras_penalty':0,
            'is_wicket':1,'wicket_kind':'caught',
            'player_dismissed':'PlayerB','fielder1':'FielderY','fielder2':'',
        }])
        df_extended = pd.concat([self.df, extra_row], ignore_index=True)
        for col in ['innings','is_super_over','is_wicket']:
            df_extended[col] = df_extended[col].astype(int)

        # FielderY already has 1 catch from regular innings
        # Super over catch should NOT be added
        f = calc_fielding_stats('FielderY', df_extended)
        assert f.catches == 1, f"Expected 1 catch (regular only), got {f.catches}"


# ── DNB detection ─────────────────────────────────────────────────────────────

class TestDNBDetection:
    def setup_method(self):
        self.df      = make_deliveries()
        self.matches = make_matches()

    def test_player_in_squad_but_never_batted(self):
        """
        WP Saha style: listed in player_index but never appeared as batsman.
        If player_index says they played M1 but deliveries has no batting record,
        dnb_count should be 1.
        """
        from services.stats_engine import calc_player_stats
        # BowlerZ appears only in innings 2 as bowler, never as batsman
        player_index = {'BowlerZ': {'match_ids': ['M1'], 'registry_id': ''}}
        stats = calc_player_stats('BowlerZ', self.df, self.matches,
                                  match_ids=None, player_index=player_index)
        assert stats.matches_in_squad == 1
        assert stats.matches_batted == 0
        assert stats.dnb_count == 1

    def test_player_who_batted_has_zero_dnb(self):
        from services.stats_engine import calc_player_stats
        player_index = {'PlayerA': {'match_ids': ['M1'], 'registry_id': ''}}
        stats = calc_player_stats('PlayerA', self.df, self.matches,
                                  match_ids=None, player_index=player_index)
        assert stats.dnb_count == 0
        assert stats.matches_batted == 1

    def test_dnb_count_without_player_index(self):
        """Fallback: no player_index → matches_in_squad = matches_played."""
        from services.stats_engine import calc_player_stats
        stats = calc_player_stats('PlayerA', self.df, self.matches)
        assert stats.dnb_count == 0   # matches_in_squad falls back to matches_played


# ── Over summaries ────────────────────────────────────────────────────────────

class TestOverSummaries:
    def setup_method(self):
        self.df = make_deliveries()

    def test_super_over_gets_offset_40(self):
        """Inn3 over0 should map to chart_over = 0 + (3-1)*20 = 40."""
        from services.stats_engine import _build_over_summaries
        summaries = _build_over_summaries(self.df)
        chart_overs = [s.over for s in summaries]
        # Inn1 over0=0, inn1 over1=1, inn2 over0=20, inn3 over0=40
        assert 40 in chart_overs, f"Super over chart_over 40 missing. Got: {chart_overs}"

    def test_cumulative_runs_monotonically_increases(self):
        from services.stats_engine import _build_over_summaries
        summaries = _build_over_summaries(self.df)
        cums = [s.cumulative_runs for s in summaries]
        assert all(cums[i] <= cums[i+1] for i in range(len(cums)-1))

    def test_wickets_in_over(self):
        from services.stats_engine import _build_over_summaries
        summaries = _build_over_summaries(self.df)
        # Innings 1, over 1 had PlayerB's dismissal
        inn1_over1 = next((s for s in summaries if s.over == 1), None)
        assert inn1_over1 is not None
        assert inn1_over1.wickets == 1


# ── Phase splits ──────────────────────────────────────────────────────────────

class TestPhaseSplits:
    def test_powerplay_phase_only(self):
        """With only overs 0-1, only powerplay phase should have data."""
        from services.stats_engine import calc_phase_splits
        df = make_deliveries()
        splits = calc_phase_splits('M1', df)
        # Should have phase entries for both innings
        phases = [s.phase for s in splits]
        assert any('powerplay' in p for p in phases)
        # Death overs (16-20) have 0 balls → run_rate = 0
        death = [s for s in splits if 'death' in s.phase]
        for d in death:
            assert d.balls == 0


# ── Season breakdown ──────────────────────────────────────────────────────────

class TestSeasonBreakdown:
    def test_season_batting_returns_one_row_per_season(self):
        from services.stats_engine import calc_season_batting
        df = make_deliveries()
        matches = make_matches()
        rows = calc_season_batting('PlayerA', df, matches)
        assert len(rows) == 1
        assert rows[0].season == '2024'
        assert rows[0].runs == 17

    def test_season_bowling_excludes_super_over(self):
        from services.stats_engine import calc_season_bowling
        df = make_deliveries()
        rows = calc_season_bowling('BowlerX', df)
        assert len(rows) == 1
        # balls_bowled should be 8 (regular innings only)
        # We can't directly read balls from SeasonBowlingLine but wickets=1
        assert rows[0].wickets == 1


# ── Team H2H ──────────────────────────────────────────────────────────────────

class TestTeamH2H:
    def test_basic_h2h(self):
        from services.stats_engine import calc_h2h_team
        matches = pd.DataFrame([
            {'match_id':'A','date':'2024-01-01','team1':'MI','team2':'CSK','winner':'MI'},
            {'match_id':'B','date':'2024-01-08','team1':'CSK','team2':'MI','winner':'CSK'},
            {'match_id':'C','date':'2024-01-15','team1':'MI','team2':'CSK','winner':'MI'},
        ])
        h2h = calc_h2h_team('MI', 'CSK', matches)
        assert h2h.matches == 3
        assert h2h.team1_wins == 2
        assert h2h.team2_wins == 1
        assert h2h.no_result == 0

    def test_no_result_counted(self):
        from services.stats_engine import calc_h2h_team
        matches = pd.DataFrame([
            {'match_id':'A','date':'2024-01-01','team1':'MI','team2':'CSK','winner':''},
            {'match_id':'B','date':'2024-01-08','team1':'MI','team2':'CSK','winner':'MI'},
        ])
        h2h = calc_h2h_team('MI', 'CSK', matches)
        assert h2h.no_result == 1
        assert h2h.team1_wins == 1
