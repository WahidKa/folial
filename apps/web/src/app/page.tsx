"use client";

import { useState } from "react";
import {
  localizedText,
  SUPPORTED_LOCALES,
  type Locale,
  type Profile,
} from "@folial/schema";
import MinimalistPortfolio from "@/themes/minimalist/MinimalistPortfolio";

const PARSER_URL =
  process.env.NEXT_PUBLIC_PARSER_URL ?? "http://localhost:8000";
const MAX_BYTES = 10 * 1024 * 1024;

type Status =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "error"; message: string };

function setLocaleText(
  profile: Profile,
  field: "title" | "summary",
  locale: Locale,
  value: string,
): Profile {
  return { ...profile, [field]: { ...(profile[field] ?? {}), [locale]: value } };
}

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [locale, setLocale] = useState<Locale>("en");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onFile(file: File | undefined) {
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".pdf") && !lower.endsWith(".docx")) {
      setStatus({
        kind: "error",
        message: "Unsupported file type. Upload a PDF or DOCX CV.",
      });
      return;
    }
    if (file.size > MAX_BYTES) {
      setStatus({ kind: "error", message: "File too large (max 10 MB)." });
      return;
    }
    setStatus({ kind: "busy" });
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${PARSER_URL}/parse`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          (body && body.detail) || `Parser failed (${res.status}).`,
        );
      }
      const parsed = (await res.json()) as Profile;
      setProfile(parsed);
      setLocale(parsed.defaultLocale);
      setStatus({ kind: "idle" });
    } catch (err) {
      setStatus({
        kind: "error",
        message:
          err instanceof Error
            ? `${err.message} Is the parser running at ${PARSER_URL}?`
            : "Upload failed.",
      });
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-950">folial</h1>
      <p className="mt-1 text-zinc-600">
        Upload a CV (PDF/DOCX), get a portfolio. English, French, Arabic + RTL.
      </p>

      <label className="mt-6 block cursor-pointer rounded-xl border-2 border-dashed border-zinc-300 px-6 py-8 text-center text-zinc-600 hover:border-zinc-500">
        <input
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          disabled={status.kind === "busy"}
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        {status.kind === "busy" ? "Parsing…" : "Choose a CV file"}
      </label>

      {status.kind === "error" && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {status.message}
        </p>
      )}

      {profile && (
        <div className="mt-8">
          <div className="flex flex-wrap items-center gap-4 rounded-xl bg-zinc-100 px-4 py-3">
            <div className="flex gap-1">
              {SUPPORTED_LOCALES.map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  className={`rounded-md px-3 py-1 text-sm font-medium ${
                    locale === l
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setProfile(null);
                setStatus({ kind: "idle" });
              }}
              className="ms-auto text-sm text-zinc-500 underline underline-offset-4"
            >
              Start over
            </button>
          </div>

          <div className="mt-4 space-y-3 rounded-xl border border-zinc-200 px-4 py-4">
            <label className="block text-sm">
              <span className="text-zinc-500">Name</span>
              <input
                value={profile.name}
                onChange={(e) =>
                  setProfile({ ...profile, name: e.target.value })
                }
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-1.5"
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-500">Title ({locale})</span>
              <input
                value={localizedText(profile.title, locale)}
                onChange={(e) =>
                  setProfile(setLocaleText(profile, "title", locale, e.target.value))
                }
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-1.5"
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-500">Summary ({locale})</span>
              <textarea
                value={localizedText(profile.summary, locale)}
                onChange={(e) =>
                  setProfile(
                    setLocaleText(profile, "summary", locale, e.target.value),
                  )
                }
                rows={3}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-1.5"
              />
            </label>
          </div>

          <div className="mt-4 rounded-xl border border-zinc-200">
            <MinimalistPortfolio profile={profile} locale={locale} />
          </div>
        </div>
      )}
    </main>
  );
}
