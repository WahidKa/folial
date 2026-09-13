import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProfileErrors } from "@/lib/validate";
import type { Profile } from "@folial/schema";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, context: Ctx) {
  const { slug } = await context.params;
  const row = await prisma.portfolio.findUnique({ where: { slug } });
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json(row.data);
}

export async function PUT(req: NextRequest, context: Ctx) {
  const { slug } = await context.params;
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
  try {
    await prisma.portfolio.update({
      where: { slug },
      data: {
        name: p.name,
        themeId: p.themeId ?? "minimalist",
        data: JSON.parse(JSON.stringify(p)),
      },
    });
    return NextResponse.json({ slug });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, context: Ctx) {
  const { slug } = await context.params;
  try {
    await prisma.portfolio.delete({ where: { slug } });
    return NextResponse.json({ slug });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}