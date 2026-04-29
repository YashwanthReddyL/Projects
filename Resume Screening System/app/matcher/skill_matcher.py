def match_skills(resume_skills, jd_skills):
    matched = list(set(resume_skills) & set(jd_skills))
    missing = list(set(jd_skills) - set(resume_skills))

    score = len(matched) / len(jd_skills) if jd_skills else 0

    return matched, missing, score