from pathlib import Path

import jsonschema
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.extractor import (
    UnreadableDocumentError,
    extract_text_from_docx,
    extract_text_from_pdf,
)
from app.parser import EmptyDocumentError, parse_profile

router = APIRouter()

MAX_BYTES = 10 * 1024 * 1024


def load_schema() -> dict:
    here = Path(__file__).resolve()
    for parent in [here.parent, *here.parents]:
        candidate = parent / "packages" / "schema" / "profile.schema.json"
        if candidate.exists():
            return json_loads(candidate)
    raise RuntimeError("profile.schema.json not found")


def json_loads(path: Path) -> dict:
    import json

    return json.loads(path.read_text(encoding="utf-8"))


SCHEMA = load_schema()


@router.post("/parse")
async def parse_cv(file: UploadFile = File(...)) -> dict:
    name = (file.filename or "").lower()
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 10 MB).")
    try:
        if name.endswith(".pdf"):
            text = extract_text_from_pdf(data)
        elif name.endswith(".docx"):
            text = extract_text_from_docx(data)
        else:
            raise HTTPException(
                status_code=422,
                detail="Unsupported file type. Upload a PDF or DOCX CV.",
            )
    except UnreadableDocumentError:
        raise HTTPException(
            status_code=422,
            detail="Could not read that file. Export your CV as a digital-text PDF or DOCX and retry.",
        ) from None
    if not text.strip():
        raise HTTPException(
            status_code=422,
            detail="No readable text found. Scanned or image-only CVs are not supported yet — export your CV as digital text and retry.",
        )
    try:
        profile = parse_profile(text)
        jsonschema.validate(profile, SCHEMA)
    except EmptyDocumentError:
        raise HTTPException(
            status_code=422,
            detail="No readable text found. Scanned or image-only CVs are not supported yet — export your CV as digital text and retry.",
        ) from None
    except jsonschema.ValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Parsed output failed validation: {exc.message}",
        ) from exc
    return profile
