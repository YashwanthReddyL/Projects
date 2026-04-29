from fastapi import APIRouter, UploadFile, File, Form
import shutil
import os

from app.parser.resume_parser import parse_resume
from app.parser.jd_parser import parse_jd
from app.matcher.scorer import calculate_score
from app.database.db import insert_candidate, get_connection

router = APIRouter()

UPLOAD_DIR = "temp"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/match")
async def match_resume(
    file: UploadFile = File(...),
    job_description: str = Form(...)
):
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    resume_data = parse_resume(file_path)
    jd_data = parse_jd(job_description)

    result = calculate_score(resume_data, jd_data)

    # Save only high scoring candidates
    if result["final_score"] >= 70:
        insert_candidate({
            "name": resume_data["name"],
            "email": resume_data["email"],
            "skills": resume_data["skills"],
            "experience_years": resume_data["experience_years"],
            "score": result["final_score"]
        })

    return {
        "resume": resume_data,
        "job_description": jd_data,
        "match_result": result
    }


@router.get("/top-candidates")
def get_top_candidates():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM candidates ORDER BY score DESC LIMIT 10")
    rows = cursor.fetchall()

    conn.close()

    return {"candidates": rows}