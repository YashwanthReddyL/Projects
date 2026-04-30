"""
team_names.py
=============
Canonical team name map for IPL.
Teams have been renamed multiple times across seasons.
This module provides a single source of truth — all variants
map to one canonical name used consistently throughout the app.

Import this anywhere you need normalisation:
    from team_names import canonical_team, CANONICAL_MAP
"""

# Each key is a variant seen in Cricsheet YAML files.
# Each value is the canonical name to use in the app.
CANONICAL_MAP: dict[str, str] = {
    # Royal Challengers
    "Royal Challengers Bangalore":      "Royal Challengers Bengaluru",
    "Royal Challengers Bengaluru":      "Royal Challengers Bengaluru",

    # Delhi franchise
    "Delhi Daredevils":                 "Delhi Capitals",
    "Delhi Capitals":                   "Delhi Capitals",

    # Punjab franchise
    "Kings XI Punjab":                  "Punjab Kings",
    "Punjab Kings":                     "Punjab Kings",

    # Hyderabad franchise
    "Sunrisers Hyderabad":              "Sunrisers Hyderabad",
    "Deccan Chargers":                  "Deccan Chargers",   # separate franchise — keep distinct

    # Pune franchises (defunct, keep as-is but unify spelling variants)
    "Rising Pune Supergiant":           "Rising Pune Supergiant",
    "Rising Pune Supergiants":          "Rising Pune Supergiant",  # spelling variant

    # Gujarat
    "Gujarat Lions":                    "Gujarat Lions",
    "Gujarat Titans":                   "Gujarat Titans",

    # Kochi (defunct)
    "Kochi Tuskers Kerala":             "Kochi Tuskers Kerala",

    # All others — no renaming needed, map to themselves
    "Chennai Super Kings":              "Chennai Super Kings",
    "Kolkata Knight Riders":            "Kolkata Knight Riders",
    "Mumbai Indians":                   "Mumbai Indians",
    "Rajasthan Royals":                 "Rajasthan Royals",
    "Sunrisers Hyderabad":              "Sunrisers Hyderabad",
    "Lucknow Super Giants":             "Lucknow Super Giants",
    "Pune Warriors":                    "Pune Warriors",
}


def canonical_team(name: str) -> str:
    """
    Return the canonical name for a team.
    If the name is not in the map, return it unchanged
    (so new teams added in future seasons don't silently break).
    """
    return CANONICAL_MAP.get(name, name)
