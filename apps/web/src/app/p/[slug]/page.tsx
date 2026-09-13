import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { localizedText, type Profile } from "@folial/schema";
import { prisma } from "@/lib/prisma";
import { getTheme } from "@/themes/registry";

// Revalidate cached pages at most once a minute; edits go live shortly after.
export const revalidate = 60;

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  const rows = await prisma.portfolio.findMany({ select: { slug: true } });
  return rows.map((r) => ({ slug: r.slug }));
}

async function loadProfile(slug: string): Promise<Profile | null> {
  const row = await prisma.portfolio.findUnique({ where: { slug } });
  if (!row) return null;
  return row.data as unknown as Profile;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await loadProfile(slug);
  if (!profile) return { title: "Not found — folial" };
  const locale = profile.defaultLocale;
  const title = localizedText(profile.title, locale);
  return {
    title: title ? `${profile.name} — ${title}` : profile.name,
    description: localizedText(profile.summary, locale) || undefined,
  };
}

export default async function PortfolioPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const profile = await loadProfile(slug);
  if (!profile) notFound();
  const { Component } = getTheme(profile.themeId);
  return <Component profile={profile} />;
}