# syntax=docker/dockerfile:1
FROM node:24-slim

RUN corepack enable && corepack prepare pnpm@12.3.4 --activate

WORKDIR /srv

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/schema/package.json ./packages/schema/
RUN pnpm install --frozen-lockfile

# --exclude keeps host node_modules/.next out of the image even when
# dockerignore files are not applied (custom Dockerfile names).
COPY --exclude=node_modules --exclude=.next apps/web/ ./apps/web/
COPY --exclude=node_modules packages/schema/ ./packages/schema/

ARG NEXT_PUBLIC_PARSER_URL=http://localhost:8000
ENV NEXT_PUBLIC_PARSER_URL=$NEXT_PUBLIC_PARSER_URL

RUN pnpm --filter web build

EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

CMD ["pnpm", "--filter", "web", "start"]