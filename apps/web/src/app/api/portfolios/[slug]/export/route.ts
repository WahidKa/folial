import { NextRequest, NextResponse } from "next/server";
import type { Profile } from "@folial/schema";
import { prisma } from "@/lib/prisma";
import { renderExportHtml } from "@/lib/exportHtml";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, context: Ctx) {
  const { slug } = await context.params;
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const row = await prisma.portfolio.findUnique({ where: { slug } });
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const html = renderExportHtml(row.data as unknown as Profile);
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.html"`,
    },
  });
}