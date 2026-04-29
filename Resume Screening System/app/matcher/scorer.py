from app.matcher.skill_matcher import match_skills


def calculate_score(resume, jd):
    matched, missing, skill_score = match_skills(
        resume["skills"], jd["required_skills"]
    )

    exp_score = 0
    if jd["required_experience"] > 0:
        exp_score = min(
            resume["experience_years"] / jd["required_experience"], 1
        )

    if resume["experience_years"] == 0:
        final_score = skill_score
    else:
        final_score = (0.7 * skill_score) + (0.3 * exp_score)

    return {
        "final_score": round(final_score * 100, 2),
        "matched_skills": matched,
        "missing_skills": missing,
        "skill_score": skill_score,
        "experience_score": exp_score
    }