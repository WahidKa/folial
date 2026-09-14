import {
  isRTL,
  localizedText,
  type Profile,
} from "@folial/schema";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Standalone, dependency-free HTML export of a portfolio.
 *  Theme-agnostic by design: the file must render identically when opened
 *  anywhere, so it carries its own minimal CSS instead of Tailwind. */
export function renderExportHtml(profile: Profile): string {
  const locale = profile.defaultLocale;
  const dir = isRTL(locale) ? "rtl" : "ltr";
  const t = (v: Parameters<typeof localizedText>[0]) =>
    esc(localizedText(v, locale));

  const contacts = [
    profile.location,
    profile.email,
    profile.phone,
    ...(profile.socials ?? []).map((s) => `${s.platform}: ${s.url}`),
  ]
    .filter(Boolean)
    .map((c) => `<span>${esc(c as string)}</span>`)
    .join("");

  const experiences = (profile.experiences ?? [])
    .map((exp) => {
      const dates = [exp.startDate, exp.present ? "present" : exp.endDate]
        .filter(Boolean)
        .join(" – ");
      const bullets = (exp.bullets ?? [])
        .map((b) => `<li>${t(b)}</li>`)
        .join("");
      return `<div class="block"><h3>${t(exp.role)}${exp.company ? ` <span class="muted">· ${esc(exp.company)}</span>` : ""}</h3>${dates ? `<p class="muted small">${esc(dates)}</p>` : ""}${bullets ? `<ul>${bullets}</ul>` : ""}</div>`;
    })
    .join("");

  const projects = (profile.projects ?? [])
    .map((p) => {
      const tech = (p.techStack ?? []).join(" · ");
      return `<div class="block"><h3>${t(p.title)}</h3>${p.description ? `<p>${t(p.description)}</p>` : ""}${tech ? `<p class="muted small">${esc(tech)}</p>` : ""}${p.url ? `<p class="small"><a href="${esc(p.url)}">${esc(p.url)}</a></p>` : ""}</div>`;
    })
    .join("");

  const skills = (() => {
    const byCat = new Map<string, string[]>();
    for (const s of profile.skills ?? []) {
      if (!s.name) continue;
      byCat.set(s.category ?? "Other", [...(byCat.get(s.category ?? "Other") ?? []), s.name]);
    }
    return [...byCat.entries()]
      .map(([cat, names]) => `<p><strong>${esc(cat)}:</strong> ${esc(names.join(", "))}</p>`)
      .join("");
  })();

  const education = (profile.education ?? [])
    .map((e) => {
      const dates = [e.startDate, e.present ? "present" : e.endDate]
        .filter(Boolean)
        .join(" – ");
      return `<div class="block"><h3>${esc(e.degree ?? "")}${e.school ? ` <span class="muted">· ${esc(e.school)}</span>` : ""}</h3>${dates ? `<p class="muted small">${esc(dates)}</p>` : ""}</div>`;
    })
    .join("");

  const languages = (profile.languages ?? [])
    .map(
      (l) => `${t(l.name)}${l.level ? ` (${esc(l.level)})` : ""}`,
    )
    .join(" · ");

  const section = (title: string, body: string) =>
    body ? `<section><h2>${title}</h2>${body}</section>` : "";

  const titles: Record<string, Record<string, string>> = {
    en: { experience: "Experience", education: "Education", projects: "Projects", skills: "Skills", languages: "Languages" },
    fr: { experience: "Expérience", education: "Formation", projects: "Projets", skills: "Compétences", languages: "Langues" },
    ar: { experience: "الخبرة المهنية", education: "التعليم", projects: "المشاريع", skills: "المهارات", languages: "اللغات" },
  };
  const h = titles[locale];

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(profile.name)}</title>
<style>
body{font-family:system-ui,-apple-system,"Segoe UI",Arial,sans-serif;max-width:42rem;margin:0 auto;padding:2rem 1.25rem;color:#18181b;line-height:1.6}
header h1{font-size:1.875rem;margin:0;letter-spacing:-0.02em}
header .tagline{font-size:1.125rem;color:#52525b;margin:.25rem 0 0}
.contacts{display:flex;flex-wrap:wrap;gap:.25rem 1rem;font-size:.875rem;color:#71717a;margin-top:.75rem}
.summary{margin-top:1rem}
section{margin-top:2rem}
h2{font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;color:#71717a;border-bottom:1px solid #e4e4e7;padding-bottom:.5rem}
.block{margin-top:1rem}
h3{font-size:1rem;margin:0}
.muted{color:#71717a;font-weight:normal}
.small{font-size:.875rem}
ul{padding-inline-start:1.25rem}
footer{margin-top:3rem;font-size:.75rem;color:#a1a1aa}
</style>
</head>
<body>
<header><h1>${esc(profile.name)}</h1>${profile.title ? `<p class="tagline">${t(profile.title)}</p>` : ""}<div class="contacts">${contacts}</div></header>
${profile.summary ? `<p class="summary">${t(profile.summary)}</p>` : ""}
${section(h.experience, experiences)}
${section(h.projects, projects)}
${section(h.skills, skills)}
${section(h.education, education)}
${languages ? section(h.languages, `<p>${esc(languages)}</p>`) : ""}
<footer>Exported with folial</footer>
</body>
</html>`;
}