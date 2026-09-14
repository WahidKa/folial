# Hosting modes

`folial` ships one web app (`apps/web`) plus an optional parser (`apps/parser`).
Swap the `DATABASE_URL` and `NEXT_PUBLIC_PARSER_URL` values below for your host.

## Local (default)

- **Database**: SQLite (`prisma/dev.db`). No setup needed.
- **Parser**: `pnpm --filter parser dev` → `http://localhost:8000`.
- **Web**: `pnpm --filter web dev` → `http://localhost:3000`.

`.env` (app/web):
```
DATABASE_URL=file:./dev.db
NEXT_PUBLIC_PARSER_URL=http://localhost:8000
```

`docker compose up` starts both services with a persisted `folial-data` volume.

## Supabase

- **Database**: Supabase Postgres (Prisma supports it natively).
- **Parser**: Deploy `apps/parser` as a separate service (Supabase Docker, Railway, Fly, etc.). Supabase Edge Functions don't run pdfplumber/python-docx, so the parser must live outside Supabase.
- **Web**: Vercel, Netlify, or Supabase itself.

`.env` (app/web):
```
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<db>
NEXT_PUBLIC_PARSER_URL=https://<parser-host>/parse
```

**Migration step**: run `npx prisma migrate deploy` after setting `DATABASE_URL`.  
**Prisma Client**: rebuild with `pnpm --filter web build` after changing `DATABASE_URL` — Prisma generates provider-specific query code at build time.

## Vercel

- **Database**: Vercel Postgres (`postgresql://...`) or `DATABASE_URL` pointing to any Postgres host.
- **Parser**: Vercel Functions can't run pdfplumber (needs Python + native libs). Keep the parser on a separate host (Railway, Fly, self-hosted) and point `NEXT_PUBLIC_PARSER_URL` there. Alternatively, skip the parser and feed JSON profiles directly into the editor via `?edit=<slug>`.
- **Web**: Vercel.

`.env` (app/web):
```
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<db>
NEXT_PUBLIC_PARSER_URL=https://<parser-host>/parse
```

**Important**: Vercel's build step runs `pnpm --filter web build`. Prisma needs `DATABASE_URL` at build time to generate the client. Add `DATABASE_URL` to your Vercel project environment variables **before** the first deploy.

## Environment variable summary

| Variable | Local | Supabase | Vercel |
|---|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | `postgresql://...` | `postgresql://...` |
| `NEXT_PUBLIC_PARSER_URL` | `http://localhost:8000` | `https://<host>/parse` | `https://<host>/parse` |

## Port mapping (local Docker)

`docker-compose.yml` exposes web on `:3000` and parser on `:8000`. Override with:
```bash
docker compose up -d
# web → http://localhost:3000
# parser → http://localhost:8000/parse
```

## Rebuilding after a DATABASE_URL change

Prisma generates provider-specific client code at build time. Always rebuild the web app after changing `DATABASE_URL`:
```bash
pnpm --filter web build
```
If using SQLite, also run:
```bash
npx prisma migrate deploy
```
This seeds the schema into the existing SQLite file if tables are missing.