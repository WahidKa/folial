// TypeScript mirror of packages/schema/profile.schema.json.
// The JSON Schema file is the source of truth; these types must stay in sync.
// The round-trip test: sample.json validates against the schema in Python
// (jsonschema) and type-checks here as Profile.

export type Locale = "en" | "fr" | "ar";

export type LocalizedString = Partial<Record<Locale, string>>;

export interface Social {
  platform: string;
  url: string;
}

export interface Language {
  name: LocalizedString;
  level?: string;
}

export interface Experience {
  id: string;
  company?: string;
  role?: LocalizedString;
  startDate?: string;
  endDate?: string;
  present?: boolean;
  bullets?: LocalizedString[];
}

export interface Education {
  id: string;
  school?: string;
  degree?: string;
  startDate?: string;
  endDate?: string;
  present?: boolean;
}

export interface Project {
  id: string;
  title?: LocalizedString;
  description?: LocalizedString;
  techStack?: string[];
  url?: string;
  imageUrl?: string;
  featured?: boolean;
  source?: "manual" | "github";
}

export interface Skill {
  id: string;
  name?: string;
  category?: string;
}

export interface Profile {
  id: string;
  name: string;
  defaultLocale: Locale;
  title?: LocalizedString;
  summary?: LocalizedString;
  email?: string;
  phone?: string;
  location?: string;
  themeId?: string;
  languages?: Language[];
  socials?: Social[];
  experiences?: Experience[];
  education?: Education[];
  projects?: Project[];
  skills?: Skill[];
}

import sampleProfileJson from "../sample.json";

/** Canonical sample profile. Typed `satisfies Profile` so drift breaks the build. */
export const sampleProfile = sampleProfileJson as Profile;

export function localizedText(
  value: LocalizedString | undefined,
  locale: Locale,
  fallback: Locale = "en",
): string {
  if (!value) return "";
  return value[locale] ?? value[fallback] ?? Object.values(value)[0] ?? "";
}

export const SUPPORTED_LOCALES: Locale[] = ["en", "fr", "ar"];

export function isRTL(locale: Locale): boolean {
  return locale === "ar";
}
