import {
  isRTL,
  localizedText,
  type Experience,
  type Locale,
  type Profile,
  type Project,
} from "@folial/schema";

interface Props {
  profile: Profile;
  locale?: Locale;
}

const HEADINGS: Record<Locale, Record<string, string>> = {
  en: {
    experience: "Professional Experience",
    education: "Education",
    projects: "Selected Projects",
    skills: "Core Competencies",
    languages: "Languages",
  },
  fr: {
    experience: "Expérience professionnelle",
    education: "Formation",
    projects: "Projets sélectionnés",
    skills: "Compétences clés",
    languages: "Langues",
  },
  ar: {
    experience: "الخبرة المهنية",
    education: "التعليم",
    projects: "مشاريع مختارة",
    skills: "الكفاءات الأساسية",
    languages: "اللغات",
  },
};

function ExpBlock({ exp, locale }: { exp: Experience; locale: Locale }) {
  const dates = [exp.startDate, exp.present ? "present" : exp.endDate]
    .filter(Boolean)
    .join(" – ");
  return (
    <div className="grid gap-1 sm:grid-cols-[1fr_160px]">
      <div>
        <h3 className="font-serif text-lg font-bold text-slate-900">
          {localizedText(exp.role, locale)}
        </h3>
        {exp.company && (
          <p className="text-sm font-medium uppercase tracking-wide text-sky-800">
            {exp.company}
          </p>
        )}
        {exp.bullets && exp.bullets.length > 0 && (
          <ul className="mt-2 list-[square] space-y-1 ps-5 text-slate-700 marker:text-sky-700">
            {exp.bullets.map((b, i) => (
              <li key={i}>{localizedText(b, locale)}</li>
            ))}
          </ul>
        )}
      </div>
      {dates && (
        <p className="text-sm text-slate-500 sm:text-end">{dates}</p>
      )}
    </div>
  );
}

function ProjectBlock({ project, locale }: { project: Project; locale: Locale }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="font-serif text-lg font-bold text-slate-900">
        {localizedText(project.title, locale)}
        {project.featured && (
          <span className="ms-2 rounded bg-sky-800 px-2 py-0.5 align-middle font-sans text-xs font-medium text-white">
            Featured
          </span>
        )}
      </h3>
      {project.description && (
        <p className="mt-1 text-slate-700">
          {localizedText(project.description, locale)}
        </p>
      )}
      <p className="mt-2 font-sans text-sm text-slate-500">
        {(project.techStack ?? []).join(" · ")}
        {project.url && (
          <>
            {" · "}
            <a
              href={project.url}
              target="_blank"
              rel="noreferrer"
              className="text-sky-800 underline underline-offset-4"
            >
              View project
            </a>
          </>
        )}
      </p>
    </div>
  );
}

export default function CorporatePortfolio({ profile, locale }: Props) {
  const active: Locale = locale ?? profile.defaultLocale;
  const h = HEADINGS[active];
  const skillsByCategory = new Map<string, string[]>();
  for (const s of profile.skills ?? []) {
    if (!s.name) continue;
    const cat = s.category ?? "Other";
    skillsByCategory.set(cat, [...(skillsByCategory.get(cat) ?? []), s.name]);
  }
  const projects = [...(profile.projects ?? [])].sort(
    (a, b) => Number(b.featured ?? false) - Number(a.featured ?? false),
  );

  return (
    <article
      lang={active}
      dir={isRTL(active) ? "rtl" : "ltr"}
      className="bg-slate-100 py-10 font-sans"
    >
      <div className="mx-auto max-w-3xl px-6">
        <header className="rounded-lg bg-slate-900 px-8 py-10 text-white">
          <h1 className="font-serif text-4xl font-bold tracking-tight">
            {profile.name}
          </h1>
          {profile.title && (
            <p className="mt-2 text-lg text-sky-200">
              {localizedText(profile.title, active)}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-300">
            {profile.location && <span>{profile.location}</span>}
            {profile.email && <span>{profile.email}</span>}
            {profile.phone && <span dir="ltr">{profile.phone}</span>}
            {(profile.socials ?? []).map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                {s.platform}
              </a>
            ))}
          </div>
        </header>

        {profile.summary && (
          <p className="mt-6 border-s-4 border-sky-800 ps-4 text-lg leading-relaxed text-slate-700">
            {localizedText(profile.summary, active)}
          </p>
        )}

        {profile.experiences && profile.experiences.length > 0 && (
          <section className="mt-8">
            <h2 className="font-serif text-xl font-bold uppercase tracking-wide text-slate-900">
              {h.experience}
            </h2>
            <div className="mt-4 space-y-6">
              {profile.experiences.map((exp) => (
                <ExpBlock key={exp.id} exp={exp} locale={active} />
              ))}
            </div>
          </section>
        )}

        {projects.length > 0 && (
          <section className="mt-8">
            <h2 className="font-serif text-xl font-bold uppercase tracking-wide text-slate-900">
              {h.projects}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {projects.map((p) => (
                <ProjectBlock key={p.id} project={p} locale={active} />
              ))}
            </div>
          </section>
        )}

        {skillsByCategory.size > 0 && (
          <section className="mt-8">
            <h2 className="font-serif text-xl font-bold uppercase tracking-wide text-slate-900">
              {h.skills}
            </h2>
            <dl className="mt-4 space-y-2">
              {[...skillsByCategory.entries()].map(([cat, names]) => (
                <div key={cat} className="flex gap-3">
                  <dt className="w-32 shrink-0 font-semibold text-slate-900">
                    {cat}
                  </dt>
                  <dd className="text-slate-700">{names.join(", ")}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {profile.education && profile.education.length > 0 && (
          <section className="mt-8">
            <h2 className="font-serif text-xl font-bold uppercase tracking-wide text-slate-900">
              {h.education}
            </h2>
            <div className="mt-4 space-y-3">
              {profile.education.map((e) => {
                const dates = [e.startDate, e.present ? "present" : e.endDate]
                  .filter(Boolean)
                  .join(" – ");
                return (
                  <div key={e.id} className="flex flex-wrap justify-between gap-2">
                    <p className="text-slate-800">
                      <span className="font-semibold">{e.degree}</span>
                      {e.school && <span> — {e.school}</span>}
                    </p>
                    {dates && <p className="text-sm text-slate-500">{dates}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {profile.languages && profile.languages.length > 0 && (
          <section className="mt-8">
            <h2 className="font-serif text-xl font-bold uppercase tracking-wide text-slate-900">
              {h.languages}
            </h2>
            <p className="mt-4 text-slate-700">
              {profile.languages
                .map(
                  (l) =>
                    `${localizedText(l.name, active)}${l.level ? ` (${l.level})` : ""}`,
                )
                .join(" · ")}
            </p>
          </section>
        )}
      </div>
    </article>
  );
}
