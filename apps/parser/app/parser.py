"""Deterministic CV heuristics: raw text -> schema-conformant profile dict.

No AI here by design (Sprint 0). Rules are total: they never throw on weird
input, they just emit less. Display strings keep their original characters;
normalization (NFKD, accent-stripping) is used for MATCHING ONLY.

Known limitation: Arabic PDFs store shaped, visual-order glyphs, so extracted
Arabic runs read right-to-left-reversed at the character level. The parser
detects the locale and keeps sections intact, but exact Arabic strings are
only fixed later (LLM pass, Phase 2). Tests assert behavior, not AR strings.
"""

from __future__ import annotations

import re
import unicodedata
import uuid

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
URL_RE = re.compile(r"https?://\S+|www\.\S+")
YEAR_RE = re.compile(r"(?:19|20)\d{2}(?:[-–/](?:0?[1-9]|1[0-2]))?")
PHONE_RE = re.compile(r"\+?[\d][\d\s().-]{5,}[\d]")
# Separators between role/company. \ufffd = replacement char from PDFs with
# broken ToUnicode maps (seen in the wild and in our own fixtures).
SEPARATOR_RE = re.compile(r"\s*(?:—|–|\||@|�)\s*|\s+-\s+")
BULLET_CHARS = "•*-–+�"

# Single normalized words. norm() lowercases + strips accents/diacritics,
# so "EXPÉRIENCE" and "experience" both hit "experience".
SECTION_WORDS: dict[str, set[str]] = {
    "experience": {
        "experience", "employment", "work",
        "الخبرة", "الخبرات", "التجربة", "العمل",
    },
    "education": {
        "education", "academic", "etudes", "enseignement", "diplome",
        "formation",
        "التعليم", "الدراسة", "المؤهلات", "التكوين",
    },
    "skills": {"skills", "skill", "competences", "savoir", "المهارات"},
    "projects": {"projects", "project", "projets", "realisations", "المشاريع", "الاعمال"},
    "summary": {"summary", "profile", "profil", "resume", "about", "objectif", "نبذة", "الملخص", "الملف"},
    "languages": {"languages", "language", "langues", "langue", "اللغات"},
}

PRESENT_PATTERNS = [
    r"\bpresent\b",
    r"\bcurrent\b",
    r"\bnow\b",
    r"aujourd",
    "حتى",
    "الحاضر",
    "الآن",
    "مستمر",
]

SOCIAL_DOMAINS = {
    "github.com": "github",
    "linkedin.com": "linkedin",
    "twitter.com": "twitter",
    "x.com": "twitter",
    "dribbble.com": "dribbble",
    "behance.net": "behance",
    "gitlab.com": "gitlab",
}


class EmptyDocumentError(Exception):
    """Raised when extraction yields no usable text (e.g. scanned PDF)."""


def norm(s: str) -> str:
    nfkd = unicodedata.normalize("NFKD", s)
    return "".join(c for c in nfkd if unicodedata.category(c) != "Mn").lower()


def ar_fix_token(token: str) -> str:
    """Reverse characters of tokens holding Arabic script.

    Arabic PDFs store shaped, visual-order glyphs, so each RTL token reads
    backwards at the codepoint level. Reversing per token restores logical
    order for MATCHING. Latin tokens are untouched. Display text never uses
    this — matching only.
    """
    if re.search(r"[؀-ۿﭐ-﷿ﹰ-﻿]", token):
        return token[::-1]
    return token


def ar_fix(s: str) -> str:
    return " ".join(ar_fix_token(t) for t in s.split())


# Normalized present-marker words (norm() applied, so الآن -> الان).
AR_PRESENT_WORDS = {"حتى", "الان", "الحاضر", "مستمر"}


def detect_locale(text: str) -> str:
    if re.search(r"[؀-ۿﭐ-﷿ﹰ-﻿]", text):
        return "ar"
    accents = len(re.findall(r"[éèêëàâçîïôûùœ]", text))
    if accents >= 3:
        return "fr"
    return "en"


def strip_edges(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip(" \t,،.;:()[]|—–-�")).strip()


def strip_bullet(line: str) -> tuple[str, bool]:
    t = line.strip()
    # Bullets can sit at either end (visual-order RTL puts them last).
    if t[:1] in BULLET_CHARS and len(t) > 1:
        return strip_edges(t[1:]), True
    if t[-1:] in BULLET_CHARS and len(t) > 1:
        return strip_edges(t[:-1]), True
    # Visual-order RTL artifact: the sentence period lands at line start.
    if t.startswith(".") and re.search(r"[؀-ۿﭐ-﷿ﹰ-﻿]", t):
        return strip_edges(t[1:]), True
    return t, False


def classify_section(line: str) -> str | None:
    """Return a section key if the line looks like a section header."""
    stripped = line.strip()
    if stripped[:1] in BULLET_CHARS or stripped[-1:] in BULLET_CHARS:
        return None
    cleaned = stripped.strip(":|-—–� ").strip()
    if not cleaned or len(norm(cleaned)) > 40:
        return None
    words = {ar_fix_token(w) for w in norm(cleaned).split()}
    for section, keywords in SECTION_WORDS.items():
        if words & keywords:
            return section
    return None


def looks_title(line: str) -> bool:
    t = line.strip()
    return (
        len(t) <= 80
        and "@" not in t
        and "http" not in t
        and "www." not in t
        and classify_section(t) is None
        and not PHONE_RE.search(t)
    )


def parse_contact_chunk(chunk: str, out: dict) -> None:
    chunk = chunk.strip()
    if not chunk:
        return
    email = EMAIL_RE.search(chunk)
    if email and "email" not in out:
        out["email"] = email.group(0)
    url = URL_RE.search(chunk)
    if url:
        raw = url.group(0).rstrip(").,;:")
        full = raw if raw.startswith("http") else f"https://{raw}"
        domain = re.sub(r"^https?://(www\.)?", "", full).split("/")[0].lower()
        platform = SOCIAL_DOMAINS.get(domain, "website")
        if all(s["url"] != full for s in out.setdefault("socials", [])):
            out["socials"].append({"platform": platform, "url": full})
    phone = PHONE_RE.search(chunk)
    if phone:
        digits = re.sub(r"\D", "", phone.group(0))
        if 7 <= len(digits) <= 16 and "phone" not in out:
            out["phone"] = phone.group(0).strip()
    if ("," in chunk or "،" in chunk) and "@" not in chunk and "http" not in chunk:
        if "location" not in out:
            out["location"] = strip_edges(chunk)


def split_dates(line: str) -> tuple[str | None, str | None, bool]:
    dates = YEAR_RE.findall(line)
    start = dates[0] if dates else None
    end = dates[1] if len(dates) > 1 else None
    fixed = ar_fix(norm(line))
    # Regex markers (latin, start with backslash) vs plain substrings (arabic).
    present = any(
        re.search(p, fixed) if p.startswith("\\") else p in fixed
        for p in PRESENT_PATTERNS
    )
    if present:
        end = None
    return start, end, present


def strip_present_markers(s: str) -> str:
    s = re.sub(r"(?i)\bpresent\b|pr[ée]sent|aujourd.?hui|\bcurrent\b|\bnow\b", " ", s)
    toks = [t for t in s.split() if ar_fix(norm(t)) not in AR_PRESENT_WORDS]
    return " ".join(toks)


def parse_job(line: str) -> dict:
    start, end, present = split_dates(line)
    parts = SEPARATOR_RE.split(line, maxsplit=1)
    if len(parts) == 2:
        role, rest = parts
        company = strip_edges(strip_present_markers(YEAR_RE.sub("", rest)))
    else:
        role, company = strip_edges(YEAR_RE.sub("", line)), ""
    role = strip_edges(strip_present_markers(role))
    job: dict = {"bullets": []}
    if role:
        job["role"] = role
    if company:
        job["company"] = company
    if start:
        job["startDate"] = start
    if end:
        job["endDate"] = end
    if present:
        job["present"] = True
    return job


def parse_profile(text: str) -> dict:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if not lines:
        raise EmptyDocumentError("no text lines extracted")
    locale = detect_locale(text)

    def loc(s: str | None) -> dict | None:
        s = (s or "").strip()
        return {locale: s} if s else None

    profile: dict = {
        "id": f"cv-{uuid.uuid4().hex[:8]}",
        "name": lines[0],
        "defaultLocale": locale,
    }

    idx = 1
    if idx < len(lines) and looks_title(lines[idx]):
        profile["title"] = loc(lines[idx])
        idx += 1

    for ln in lines[idx : idx + 7]:
        for chunk in ln.split("|"):
            parse_contact_chunk(chunk, profile)

    sections: dict[str, list[str]] = {}
    current: str | None = None
    for ln in lines[idx:]:
        section = classify_section(ln)
        if section:
            current = section
            sections.setdefault(section, [])
        elif current:
            sections[current].append(ln)
    # Contact-ish lines before the first header belong to no section; ignore.

    if sections.get("summary"):
        summary = " ".join(strip_bullet(ln)[0] for ln in sections["summary"])
        if loc(summary):
            profile["summary"] = loc(summary)

    experiences = []
    current_job: dict | None = None

    def flush_job() -> None:
        nonlocal current_job
        if current_job and (current_job.get("role") or current_job.get("company")):
            bullets = [b for b in current_job.pop("bullets") if b]
            if bullets:
                current_job["bullets"] = bullets
            current_job["id"] = f"exp-{len(experiences):03d}"
            experiences.append(current_job)
        current_job = None

    for raw in sections.get("experience", []):
        text_line, is_bullet = strip_bullet(raw)
        if not text_line:
            continue
        if not is_bullet and (
            YEAR_RE.search(text_line) or SEPARATOR_RE.search(text_line)
        ):
            flush_job()
            current_job = parse_job(text_line)
        elif current_job is None and not is_bullet:
            current_job = parse_job(text_line)
        elif current_job is not None:
            if is_bullet or not current_job["bullets"]:
                if loc(text_line):
                    current_job["bullets"].append(loc(text_line))
            else:
                prev = current_job["bullets"].pop()
                merged = (list(prev.values())[0] + " " + text_line).strip()
                current_job["bullets"].append(loc(merged))
    flush_job()
    for job in experiences:
        if job.get("role"):
            job["role"] = loc(job["role"])
    if experiences:
        profile["experiences"] = experiences

    education = []
    for i, raw in enumerate(sections.get("education", [])):
        line, _ = strip_bullet(raw)
        if not line:
            continue
        start, end, present = split_dates(line)
        rest = strip_edges(YEAR_RE.sub("", line))
        parts = [p.strip() for p in re.split(r"[,،]", rest) if p.strip()]
        entry: dict = {"id": f"edu-{i:03d}"}
        if parts:
            entry["degree"] = parts[0]
        if len(parts) > 1:
            entry["school"] = ", ".join(parts[1:])
        if start:
            entry["startDate"] = start
        if end:
            entry["endDate"] = end
        if present:
            entry["present"] = True
        education.append(entry)
    if education:
        profile["education"] = education

    skills = []
    for raw in sections.get("skills", []):
        line, _ = strip_bullet(raw)
        for token in re.split(r"[,;،|/·]", line):
            name = token.strip()
            if name and len(name) <= 60 and not name.isdigit():
                skills.append({"id": f"sk-{len(skills):03d}", "name": name})
    if skills:
        profile["skills"] = skills

    languages = []
    for raw in sections.get("languages", []):
        line, _ = strip_bullet(raw)
        if not line:
            continue
        parts = re.split(r"\s*:\s*|\s+-\s+", line, maxsplit=1)
        entry: dict = {}
        if loc(parts[0]):
            entry["name"] = loc(parts[0])
        if len(parts) > 1 and parts[1].strip():
            entry["level"] = parts[1].strip()
        if "name" in entry:
            languages.append(entry)
    if languages:
        profile["languages"] = languages

    projects = []
    current_project: dict | None = None

    def flush_project() -> None:
        nonlocal current_project
        if current_project and current_project.get("title"):
            if current_project.get("_desc"):
                desc = " ".join(current_project.pop("_desc")).strip()
                if loc(desc):
                    current_project["description"] = loc(desc)
            else:
                current_project.pop("_desc", None)
            current_project["id"] = f"prj-{len(projects):03d}"
            current_project.setdefault("source", "manual")
            projects.append(current_project)
        current_project = None

    for raw in sections.get("projects", []):
        text_line, is_bullet = strip_bullet(raw)
        if not text_line:
            continue
        url_match = URL_RE.search(text_line)
        if not is_bullet and (url_match or current_project is None):
            flush_project()
            title = strip_edges(
                text_line[: url_match.start()] if url_match else text_line
            )
            current_project = {"title": loc(title), "_desc": []}
            if url_match:
                current_project["url"] = url_match.group(0).rstrip(").,;:")
        elif current_project is not None:
            current_project["_desc"].append(text_line)
    flush_project()
    for project in projects:
        if project.get("title"):
            pass  # already localized
        else:
            project.pop("title", None)
    if projects:
        profile["projects"] = projects

    return profile
