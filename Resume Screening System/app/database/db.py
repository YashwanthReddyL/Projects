import sqlite3
import os

# ✅ Correct DB path (inside app/database/)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "candidates.db")


def get_connection():
    return sqlite3.connect(DB_PATH)


def create_table():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT,
        skills TEXT,
        experience REAL,
        score REAL
    )
    """)

    conn.commit()
    conn.close()


def insert_candidate(candidate):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO candidates (name, email, skills, experience, score)
    VALUES (?, ?, ?, ?, ?)
    """, (
        candidate.get("name"),
        candidate.get("email"),
        ", ".join(candidate.get("skills", [])),
        candidate.get("experience_years"),
        candidate.get("score")
    ))

    conn.commit()
    conn.close()


def get_top_candidates(limit=10):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT * FROM candidates ORDER BY score DESC LIMIT ?",
        (limit,)
    )

    rows = cursor.fetchall()
    conn.close()

    return rows