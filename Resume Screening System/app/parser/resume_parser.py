import re
from app.extractor.pdf_extractor import extract_text_from_pdf
from app.nlp.skill_extractor import extract_skills


def extract_email(text):
    match = re.search(r"\S+@\S+", text)
    return match.group(0) if match else None


def extract_name(text):
    lines = text.strip().split("\n")

    for line in lines[:10]:
        if 2 <= len(line.split()) <= 4:
            return line.strip()

    return None


def extract_experience(text):
    years = re.findall(r"(\d+(?:\.\d+)?)\s*(years|year)", text.lower())
    months = re.findall(r"(\d+)\s*(months|month)", text.lower())

    total = 0

    if years:
        total += float(years[0][0])

    if months:
        total += int(months[0][0]) / 12

    return round(total, 1)


def extract_education(text):
    degrees = ["b.tech", "m.tech", "bachelor", "master", "phd"]
    text_lower = text.lower()

    for degree in degrees:
        if degree in text_lower:
            return degree

    return None


def parse_resume(file_path):
    text = extract_text_from_pdf(file_path)

    return {
        "name": extract_name(text),
        "email": extract_email(text),
        "skills": extract_skills(text),
        "experience_years": extract_experience(text),
        "education": extract_education(text)
    }