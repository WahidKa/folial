# folial

AI-powered CV → portfolio generator. Upload a CV (PDF/DOCX), get a live portfolio in English, French or Arabic — RTL included. Open source, self-hostable.

## Status

Sprint 0 in progress: CV parsing pipeline → render loop. No AI yet — that comes after the core loop works.

## Stack

- `apps/web` — Next.js 15 (App Router), Tailwind CSS, themes
- `apps/parser` — FastAPI, pdfplumber + python-docx, JSON Schema contract validation
- `packages/schema` — shared JSON Schema (single source of truth)
- SQLite via Docker (self-hosted) · Groq / Ollama for AI passes (Phase 2)

## Getting started

Coming with Sprint 0's `docker compose up` success bar.

## License

MIT