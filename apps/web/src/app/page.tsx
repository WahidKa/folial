"use client";

import { useEffect, useState } from "react";
import {
  localizedText,
  SUPPORTED_LOCALES,
  type Experience,
  type Locale,
  type LocalizedString,
  type Profile,
} from "@folial/schema";
import { getTheme, THEMES } from "@/themes/registry";

const PARSER_URL =
  process.env.NEXT_PUBLIC_PARSER_URL ?? "http://localhost:8000";
const MAX_BYTES = 10 * 1024 * 1024;

type Status =
  | { kind: "idle" }
  | { kind: "busy"; what: string }
  | { kind: "error"; message: string }
  | { kind: "saved"; slug: string };

const inputCls =
  "mt-1 w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm";

function setText(
  value: LocalizedString | undefined,
  locale: Locale,
  text: string,
): LocalizedString {
  return { ...(value ?? {}), [locale]: text };
}

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function ExperienceEditor({
  experiences,
  locale,
  onChange,
}: {
  experiences: Experience[];
  locale: Locale;
  onChange: (next: Experience[]) => void;
}) {
  function update(index: number, patch: Partial<Experience>) {
    onChange(experiences.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  return (
    <div className="space-y-4">
      {experiences.map((exp, i) => (
        <div key={exp.id} className="rounded-lg border border-zinc-200 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-zinc-500">Role ({locale})</span>
              <input
                value={localizedText(exp.role, locale)}
                onChange={(e) =>
                  update(i, { role: setText(exp.role, locale, e.target.value) })
                }
                className={inputCls}
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-500">Company</span>
              <input
                value={exp.company ?? ""}
                onChange={(e) => update(i, { company: e.target.value })}
                className={inputCls}
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-500">Start (YYYY-MM)</span>
              <input
                value={exp.startDate ?? ""}
                onChange={(e) => update(i, { startDate: e.target.value })}
                placeholder="2022-06"
                className={inputCls}
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-500">End (YYYY-MM)</span>
              <input
                value={exp.present ? "" : (exp.endDate ?? "")}
                disabled={exp.present}
                onChange={(e) => update(i, { endDate: e.target.value })}
                placeholder="2024-01"
                className={`${inputCls} disabled:bg-zinc-100`}
              />
            </label>
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm text-zinc-600">
            <input
              type="checkbox"
              checked={exp.present ?? false}
              onChange={(e) =>
                update(i, { present: e.target.checked || undefined })
              }
            />
            Current role
          </label>
          <div className="mt-2 space-y-1">
            {(exp.bullets ?? []).map((b, j) => (
              <div key={j} className="flex gap-2">
                <input
                  value={localizedText(b, locale)}
                  onChange={(e) => {
                    const bullets = [...(exp.bullets ?? [])];
                    bullets[j] = setText(b, locale, e.target.value);
                    update(i, { bullets });
                  }}
                  className={`${inputCls} mt-0`}
                />
                <button
                  onClick={() =>
                    update(i, {
                      bullets: (exp.bullets ?? []).filter((_, k) => k !== j),
                    })
                  }
                  className="shrink-0 px-2 text-sm text-red-600"
                  aria-label="Remove bullet"
                >
                  ✕
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <button
                onClick={() =>
                  update(i, {
                    bullets: [...(exp.bullets ?? []), { [locale]: "" }],
                  })
                }
                className="text-sm text-zinc-600 underline underline-offset-4"
              >
                + Add bullet
              </button>
              <button
                onClick={() => onChange(experiences.filter((_, k) => k !== i))}
                className="ms-auto text-sm text-red-600 underline underline-offset-4"
              >
                Remove role
              </button>
            </div>
          </div>
        </div>
      ))}
      <button
        onClick={() =>
          onChange([
            ...experiences,
            { id: newId("exp"), role: { [locale]: "" }, bullets: [] },
          ])
        }
        className="text-sm font-medium text-zinc-900 underline underline-offset-4"
      >
        + Add experience
      </button>
    </div>
  );
}

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [locale, setLocale] = useState<Locale>("en");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // Deep-link editing: /?edit=<slug>
  useEffect(() => {
    const edit = new URLSearchParams(window.location.search).get("edit");
    if (!edit) return;
    setStatus({ kind: "busy", what: "Loading…" });
    fetch(`/api/portfolios/${edit}`)
      .then((res) => {
        if (!res.ok) throw new Error("Portfolio not found.");
        return res.json();
      })
      .then((p: Profile) => {
        setProfile(p);
        setSlug(edit);
        setLocale(p.defaultLocale);
        setStatus({ kind: "saved", slug: edit });
      })
      .catch((err: Error) =>
        setStatus({ kind: "error", message: err.message }),
      );
  }, []);

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
    setStatus({ kind: "busy", what: "Parsing…" });
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${PARSER_URL}/parse`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || `Parser failed (${res.status}).`);
      }
      const parsed = (await res.json()) as Profile;
      setProfile(parsed);
      setSlug(null);
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

  async function onSave() {
    if (!profile) return;
    setStatus({ kind: "busy", what: "Saving…" });
    try {
      const res = await fetch(
        slug ? `/api/portfolios/${slug}` : "/api/portfolios",
        {
          method: slug ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Save failed (${res.status}).`);
      }
      const { slug: next } = (await res.json()) as { slug: string };
      setSlug(next);
      setStatus({ kind: "saved", slug: next });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Save failed.",
      });
    }
  }

  const ThemePreview = profile
    ? getTheme(profile.themeId).Component
    : null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-950">folial</h1>
      <p className="mt-1 text-zinc-600">
        Upload a CV (PDF/DOCX), get a portfolio. English, French, Arabic + RTL.
      </p>

      {!profile && (
        <label className="mt-6 block cursor-pointer rounded-xl border-2 border-dashed border-zinc-300 px-6 py-8 text-center text-zinc-600 hover:border-zinc-500">
          <input
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            disabled={status.kind === "busy"}
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          {status.kind === "busy" ? status.what : "Choose a CV file"}
        </label>
      )}

      {status.kind === "error" && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700"
        >
          {status.message}
        </p>
      )}

      {status.kind === "saved" && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          Saved. Share it:{" "}
          <a
            href={`/p/${status.slug}`}
            className="font-medium underline underline-offset-4"
          >
            /p/{status.slug}
          </a>
        </p>
      )}

      {profile && ThemePreview && (
        <div className="mt-8">
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-zinc-100 px-4 py-3">
            <div className="flex gap-1" role="group" aria-label="Language">
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
            <div className="flex gap-1" role="group" aria-label="Theme">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() =>
                    setProfile({ ...profile, themeId: t.id })
                  }
                  className={`rounded-md px-3 py-1 text-sm font-medium ${
                    (profile.themeId ?? "minimalist") === t.id
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <div className="ms-auto flex gap-3">
              <button
                onClick={() => {
                  setProfile(null);
                  setSlug(null);
                  setStatus({ kind: "idle" });
                }}
                className="text-sm text-zinc-500 underline underline-offset-4"
              >
                Start over
              </button>
              <button
                onClick={() => void onSave()}
                disabled={status.kind === "busy"}
                className="rounded-md bg-zinc-900 px-4 py-1 text-sm font-medium text-white disabled:opacity-50"
              >
                {status.kind === "busy"
                  ? status.what
                  : slug
                    ? "Save changes"
                    : "Save portfolio"}
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            Editing the {locale.toUpperCase()} version. Other languages are kept
            as parsed.
          </p>

          <div className="mt-4 space-y-3 rounded-xl border border-zinc-200 px-4 py-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-zinc-500">Name</span>
                <input
                  value={profile.name}
                  onChange={(e) =>
                    setProfile({ ...profile, name: e.target.value })
                  }
                  className={inputCls}
                />
              </label>
              <label className="block text-sm">
                <span className="text-zinc-500">Title ({locale})</span>
                <input
                  value={localizedText(profile.title, locale)}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      title: setText(profile.title, locale, e.target.value),
                    })
                  }
                  className={inputCls}
                />
              </label>
              <label className="block text-sm">
                <span className="text-zinc-500">Email</span>
                <input
                  value={profile.email ?? ""}
                  onChange={(e) =>
                    setProfile({ ...profile, email: e.target.value })
                  }
                  className={inputCls}
                />
              </label>
              <label className="block text-sm">
                <span className="text-zinc-500">Phone</span>
                <input
                  value={profile.phone ?? ""}
                  onChange={(e) =>
                    setProfile({ ...profile, phone: e.target.value })
                  }
                  className={inputCls}
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="text-zinc-500">Location</span>
              <input
                value={profile.location ?? ""}
                onChange={(e) =>
                  setProfile({ ...profile, location: e.target.value })
                }
                className={inputCls}
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-500">Summary ({locale})</span>
              <textarea
                value={localizedText(profile.summary, locale)}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    summary: setText(profile.summary, locale, e.target.value),
                  })
                }
                rows={3}
                className={inputCls}
              />
            </label>
          </div>

          <div className="mt-4 rounded-xl border border-zinc-200 px-4 py-4">
            <h2 className="mb-3 font-semibold text-zinc-900">Experience</h2>
            <ExperienceEditor
              experiences={profile.experiences ?? []}
              locale={locale}
              onChange={(experiences) => setProfile({ ...profile, experiences })}
            />
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
            <ThemePreview profile={profile} locale={locale} />
          </div>
        </div>
      )}
    </main>
  );
}
