# Resume Screening System (ATS-like)

## Overview

This project is a simplified Applicant Tracking System (ATS) that parses resumes, analyzes job descriptions, and ranks candidates based on their suitability.

It uses rule-based NLP techniques for skill extraction and scoring, and provides a clean web interface for interaction.

---

## Features

* Resume parsing from PDF files
* Job description analysis
* Skill extraction with normalization (alias mapping)
* Candidate scoring system (skills + experience)
* SQLite database integration for storing top candidates
* REST API built with FastAPI
* Simple frontend UI for interaction
* No dependency on LLMs (cost-efficient)

---

## Project Structure

```id="p9k3as"
resume_screening_system/
│
├── app/
│   ├── main.py
│
│   ├── api/
│   │   └── routes.py
│
│   ├── parser/
│   │   ├── resume_parser.py
│   │   └── jd_parser.py
│
│   ├── extractor/
│   │   └── pdf_extractor.py
│
│   ├── nlp/
│   │   └── skill_extractor.py
│
│   ├── matcher/
│   │   ├── skill_matcher.py
│   │   └── scorer.py
│
│   ├── database/
│   │   └── db.py
│
│   ├── models/
│   └── utils/
│
├── data/
│   └── skills.json
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── temp/                  # Uploaded resumes
├── tests/
├── run.py
├── requirements.txt
└── README.md
```

---

## Tech Stack

* Python 3.10+
* FastAPI
* Uvicorn
* PyMuPDF (PDF parsing)
* spaCy (NLP)
* SQLite (database)
* HTML, CSS, JavaScript (frontend)

---

## System Architecture

1. Resume uploaded via frontend
2. Backend extracts text from PDF
3. Skills are normalized using alias mapping
4. Job description is parsed
5. Matching engine compares skills
6. Scoring engine calculates final score
7. High-scoring candidates are stored in database
8. Results displayed in UI

---

## Installation and Setup

### 1. Clone the repository

```bash id="v0n2k5"
git clone <repository-url>
cd resume_screening_system
```

---

### 2. Create virtual environment

```bash id="fx4f8p"
python3 -m venv venv
source venv/bin/activate
```

---

### 3. Install dependencies

```bash id="mf5mvl"
pip install -r requirements.txt
```

---

### 4. Download spaCy model

```bash id="fqk5gk"
python -m spacy download en_core_web_sm
```

---

### 5. Run backend server

```bash id="5zq6oz"
python run.py
```

---

### 6. Open frontend

Open in browser:

```text id="bznn1b"
frontend/index.html
```

---

## API Endpoints

### POST `/match`

Upload resume and job description.

**Input:**

* file: Resume (PDF)
* job_description: Text

**Output:**

* Parsed resume data
* Parsed job description
* Match score and skill comparison

---

### GET `/top-candidates`

Returns top ranked candidates from database.

---

## Scoring Logic

Final score is calculated as:

```id="hzzxpm"
Final Score = (0.7 × Skill Match) + (0.3 × Experience Match)
```

* Skill Match: Ratio of matched skills to required skills
* Experience Match: Based on required vs actual experience

If experience is zero, scoring is based only on skills.

---

## Database Design

Table: `candidates`

| Column     | Type          |
| ---------- | ------------- |
| id         | INTEGER       |
| name       | TEXT          |
| email      | TEXT (UNIQUE) |
| skills     | TEXT          |
| experience | REAL          |
| score      | REAL          |

* Uses SQLite
* Prevents duplicates using email constraint
* Updates existing candidates using UPSERT

---

## Frontend Features

* Resume upload interface
* Job description input
* Candidate analysis display
* Score visualization
* Matched vs missing skills

---

## Limitations

* Basic experience extraction
* No semantic similarity beyond alias mapping
* Limited skill dataset
* No authentication system

---

## Future Improvements

* Multi-resume ranking system
* Semantic matching using embeddings
* Advanced experience parsing
* Recruiter dashboard
* Cloud deployment
* React-based frontend
