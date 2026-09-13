"""Raw text extraction from PDF/DOCX bytes. No interpretation here."""

from __future__ import annotations

from io import BytesIO

import pdfplumber
from docx import Document


class UnreadableDocumentError(Exception):
    """Raised when bytes cannot be turned into text at all."""


def extract_text_from_pdf(data: bytes) -> str:
    try:
        with pdfplumber.open(BytesIO(data)) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)
    except Exception as exc:
        raise UnreadableDocumentError(f"cannot read PDF: {exc}") from exc


def extract_text_from_docx(data: bytes) -> str:
    try:
        doc = Document(BytesIO(data))
        return "\n".join(p.text for p in doc.paragraphs)
    except Exception as exc:
        raise UnreadableDocumentError(f"cannot read DOCX: {exc}") from exc
