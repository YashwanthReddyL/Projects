import re
from app.nlp.skill_extractor import extract_skills


def extract_experience(text):
    match = re.search(r"(\d+)\+?\s*(years|year)", text.lower())
    return int(match.group(1)) if match else 0


def parse_jd(text: str):
    return {
        "required_skills": extract_skills(text),
        "required_experience": extract_experience(text)
    }