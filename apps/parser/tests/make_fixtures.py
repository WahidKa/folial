"""Generate the Sprint 0 parser test corpus.

Run from apps/parser with the venv:
    python tests/make_fixtures.py

Outputs (committed to git):
    tests/fixtures/en_cv.pdf      English CV (pdfplumber path)
    tests/fixtures/fr_cv.pdf      French CV (accents, présent)
    tests/fixtures/ar_cv.pdf      Arabic CV (shaped RTL rendering)
    tests/fixtures/en_cv.docx     Same content as en_cv.pdf (python-docx path)
    tests/fixtures/garbage.pdf    Random bytes (clean-error path)

Notes:
- Arabic lines are shaped (arabic_reshaper + python-bidi) so the PDF renders
  correctly in a viewer. pdfplumber therefore extracts VISUAL-order glyphs
  (presentation forms). The parser normalizes with NFKD and the AR test only
  asserts locale + schema validity + section counts, never exact strings.
- Windows Arial is used because it ships Arabic glyphs. Fixtures are generated
  once and committed, so no font is needed at runtime or in Docker.
"""

from __future__ import annotations

import os
from pathlib import Path

import arabic_reshaper
from bidi.algorithm import get_display
from docx import Document
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

FIXTURES = Path(__file__).parent / "fixtures"
ARIAL = r"C:\Windows\Fonts\arial.ttf"

EN_LINES = [
    "Yasmine Berrada",
    "Frontend Developer",
    "yasmine.berrada@example.com | +212 6 62 98 76 54 | Rabat, Morocco | https://github.com/yasmineberrada | https://www.linkedin.com/in/yasmineberrada",
    "SUMMARY",
    "Frontend developer with 3 years of experience building responsive web apps with React and TypeScript.",
    "EXPERIENCE",
    "Frontend Developer — NexaTech, 2022-06 – present",
    "• Built a component library used by 4 product teams.",
    "• Improved Lighthouse performance score from 62 to 94.",
    "Junior Web Developer — WebSprint, 2021-01 – 2022-05",
    "• Maintained client WordPress sites and migrated 6 of them to React.",
    "EDUCATION",
    "Bachelor in Software Engineering, INPT Rabat, 2017 – 2021",
    "SKILLS",
    "React, TypeScript, Tailwind CSS, Git, Figma",
    "LANGUAGES",
    "Arabic: Native",
    "French: Fluent",
    "English: Professional",
    "PROJECTS",
    "Portfolio starter — https://github.com/yasmineberrada/starter",
    "• Open-source Next.js starter with RTL support.",
]

FR_LINES = [
    "Karim Benali",
    "Développeur backend",
    "karim.benali@example.com | +33 6 12 34 56 78 | Lyon, France | https://github.com/karimbenali",
    "PROFIL",
    "Développeur backend avec 5 ans d'expérience en Python et PostgreSQL.",
    "EXPÉRIENCE",
    "Développeur backend — DataLyon, 2021-03 – présent",
    "• Conçu des API REST utilisées par 200 000 utilisateurs mensuels.",
    "• Réduit le temps de réponse moyen de 40 %.",
    "Développeur junior — StartUp42, 2019-07 – 2021-02",
    "• Automatisé les déploiements avec Docker et GitHub Actions.",
    "FORMATION",
    "Master informatique, Université Lyon 1, 2017 – 2019",
    "COMPÉTENCES",
    "Python, FastAPI, PostgreSQL, Docker, Redis",
    "LANGUES",
    "Français : Natif",
    "Anglais : Professionnel",
    "PROJETS",
    "API recettes — https://github.com/karimbenali/recettes-api",
    "• API open-source de recettes de cuisine marocaine.",
]

AR_LINES = [
    "ليلى العلوي",
    "مطورة تطبيقات موبايل",
    "laila.alaoui@example.com | +212 6 63 11 22 33 | الدار البيضاء، المغرب | https://github.com/lailaalaoui",
    "نبذة",
    "مطورة تطبيقات موبايل بخبرة سنتين في Flutter وإدارة الحالة.",
    "الخبرة المهنية",
    "مطورة موبايل — تك نوفا، 2022 – حتى الآن",
    "• نشرت 3 تطبيقات على App Store وGoogle Play.",
    "• حسنت تقييم التطبيق من 3.8 إلى 4.6.",
    "التعليم",
    "إجازة في المعلوميات، جامعة محمد الخامس، 2018 – 2022",
    "المهارات",
    "Flutter، Dart، Firebase، Git",
    "اللغات",
    "العربية: اللغة الأم",
    "الفرنسية: جيدة",
    "الإنجليزية: متوسطة",
]


def shape(line: str) -> str:
    """Shape one line for correct visual rendering (identity for Latin text)."""
    return get_display(arabic_reshaper.reshape(line))


def write_pdf(path: Path, lines: list[str]) -> None:
    pdfmetrics.registerFont(TTFont("FixtureArial", ARIAL))
    c = canvas.Canvas(str(path))
    c.setFont("FixtureArial", 11)
    y = 800.0
    for line in lines:
        c.drawString(50, y, shape(line))
        y -= 15
    c.save()


def write_docx(path: Path, lines: list[str]) -> None:
    doc = Document()
    for line in lines:
        doc.add_paragraph(line)
    doc.save(str(path))


def main() -> None:
    if not Path(ARIAL).exists():
        raise SystemExit(f"Font not found: {ARIAL} (generate fixtures on Windows)")
    FIXTURES.mkdir(parents=True, exist_ok=True)
    write_pdf(FIXTURES / "en_cv.pdf", EN_LINES)
    write_pdf(FIXTURES / "fr_cv.pdf", FR_LINES)
    write_pdf(FIXTURES / "ar_cv.pdf", AR_LINES)
    write_docx(FIXTURES / "en_cv.docx", EN_LINES)
    (FIXTURES / "garbage.pdf").write_bytes(b"%PDF-1.4 corrupted\n" + os.urandom(2048))
    print(f"wrote 5 fixtures to {FIXTURES}")


if __name__ == "__main__":
    main()
