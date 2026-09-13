import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProfileErrors } from "@/lib/validate";
import type { Profile } from "@folial/schema";

function slugify(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "portfolio";
}

export async function GET() {
  const rows = await prisma.portfolio.findMany({
    orderBy: { updatedAt: "desc" },
    select: { slug: true, name: true, themeId: true, updatedAt: true },
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const profile = (body as { profile?: unknown } | null)?.profile;
  const errors = getProfileErrors(profile);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Profile failed validation.", details: errors },
      { status: 422 },
    );
  }
  const p = profile as Profile;
  const base = slugify(p.name);
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = `${base}-${randomBytes(3).toString("hex")}`;
    try {
      const row = await prisma.portfolio.create({
        data: {
          slug,
          name: p.name,
          themeId: p.themeId ?? "minimalist",
          data: JSON.parse(JSON.stringify(p)),
        },
        select: { slug: true },
      });
      return NextResponse.json(row, { status: 201 });
    } catch {
      // Likely slug collision — retry with a fresh suffix.
    }
  }
  return NextResponse.json(
    { error: "Could not allocate a slug, retry." },
    { status: 500 },
  );
}