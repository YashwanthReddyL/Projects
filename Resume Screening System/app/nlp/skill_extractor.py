import json

def load_skills():
    with open("data/skills.json", "r") as f:
        return json.load(f)

SKILL_MAP = load_skills()


def extract_skills(text: str):
    text_lower = text.lower()
    extracted = []

    for skill in SKILL_MAP:
        for alias in skill["aliases"]:
            if alias in text_lower:
                extracted.append(skill["name"])
                break

    return list(set(extracted))