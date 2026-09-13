"""Contract tests: every fixture parses to schema-valid profile JSON.

Run from apps/parser:  python -m pytest tests/ -q

The AR assertions are behavioral on purpose — Arabic PDFs store shaped,
visual-order glyphs (see make_fixtures.py), so exact AR strings are not
asserted. Locale detection + section structure + schema validity are.
"""

from __future__ import annotations

import json
from pathlib import Path

import jsonschema
import pytest
from fastapi.testclient import TestClient

from app.main import app

ROOT = Path(__file__).parent
FIXTURES = ROOT / "fixtures"
REPO_ROOT = ROOT.parent.parent.parent  # apps/parser/tests -> repo root
SCHEMA = json.loads(
    (REPO_ROOT / "packages/schema/profile.schema.json").read_text(encoding="utf-8")
)
SAMPLE = json.loads(
    (REPO_ROOT / "packages/schema/sample.json").read_text(encoding="utf-8")
)

client = TestClient(app)

MIME = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain",
}


def post_fixture(filename: str):
    path = FIXTURES / filename
    with path.open("rb") as f:
        return client.post(
            "/parse", files={"file": (filename, f, MIME[path.suffix])}
        )


def assert_valid(profile: dict) -> dict:
    jsonschema.validate(profile, SCHEMA)
    return profile


def test_sample_contract():
    """The shared sample file validates — the Python side of the round-trip."""
    jsonschema.validate(SAMPLE, SCHEMA)


def test_en_pdf():
    res = post_fixture("en_cv.pdf")
    assert res.status_code == 200, res.text
    p = assert_valid(res.json())
    assert p["name"] == "Yasmine Berrada"
    assert p["email"] == "yasmine.berrada@example.com"
    assert p["defaultLocale"] == "en"
    assert p["experiences"][0]["company"] == "NexaTech"
    assert p["experiences"][0]["startDate"] == "2022-06"
    assert p["experiences"][0]["present"] is True
    assert len(p["experiences"][0]["bullets"]) == 2
    assert len(p["experiences"]) == 2
    assert any(s["name"] == "React" for s in p["skills"])
    assert len(p["education"]) == 1
    assert p["socials"][0] == {
        "platform": "github",
        "url": "https://github.com/yasmineberrada",
    }
    assert p["languages"][0]["name"] == {"en": "Arabic"}


def test_en_docx_mirrors_pdf():
    pdf = post_fixture("en_cv.pdf").json()
    res = post_fixture("en_cv.docx")
    assert res.status_code == 200, res.text
    docx = assert_valid(res.json())
    assert docx["name"] == pdf["name"]
    assert docx["email"] == pdf["email"]
    assert docx["experiences"][0]["company"] == pdf["experiences"][0]["company"]
    assert len(docx["experiences"]) == len(pdf["experiences"])


def test_fr_pdf():
    res = post_fixture("fr_cv.pdf")
    assert res.status_code == 200, res.text
    p = assert_valid(res.json())
    assert p["name"] == "Karim Benali"
    assert p["defaultLocale"] == "fr"
    assert p["experiences"][0]["company"] == "DataLyon"
    assert p["experiences"][0]["present"] is True
    assert any(s["name"] == "PostgreSQL" for s in p["skills"])


def test_ar_pdf():
    res = post_fixture("ar_cv.pdf")
    assert res.status_code == 200, res.text
    p = assert_valid(res.json())
    assert p["defaultLocale"] == "ar"
    assert p["name"].strip() != ""
    assert len(p["experiences"]) >= 1
    assert len(p["skills"]) >= 3


def test_garbage_pdf_returns_clean_error():
    res = post_fixture("garbage.pdf")
    assert res.status_code == 422
    assert "digital" in res.json()["detail"].lower()


def test_unsupported_extension(tmp_path):
    note = tmp_path / "notes.txt"
    note.write_text("just some text", encoding="utf-8")
    with note.open("rb") as f:
        res = client.post("/parse", files={"file": ("notes.txt", f, MIME[".txt"])})
    assert res.status_code == 422
