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

function Prompt() {
  return <span className="select-none text-emerald-500">$ </span>;
}

function ExpBlock({ exp, locale }: { exp: Experience; locale: Locale }) {
  const dates = [exp.startDate, exp.present ? "present" : exp.endDate]
    .filter(Boolean)
    .join(" – ");
  return (
    <div>
      <p className="text-slate-100">
        <Prompt />
        <span className="font-semibold">{localizedText(exp.role, locale)}</span>
        {exp.company && <span className="text-slate-400"> @ {exp.company}</span>}
        {dates && <span className="text-slate-500"> [{dates}]</span>}
      </p>
      {exp.bullets && exp.bullets.length > 0 && (
        <ul className="mt-1 space-y-1 ps-6 text-slate-300">
          {exp.bullets.map((b, i) => (
            <li key={i}>
              <span className="text-emerald-600">-&gt; </span>
              {localizedText(b, locale)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProjectBlock({ project, locale }: { project: Project; locale: Locale }) {
  return (
    <div>
      <p className="text-slate-100">
        <Prompt />
        <span className="font-semibold">
          {localizedText(project.title, locale)}
        </span>
        {project.featured && (
          <span className="ms-2 rounded bg-emerald-900 px-1.5 py-0.5 align-middle font-mono text-xs text-emerald-300">
            featured
          </span>
        )}
      </p>
      {project.description && (
        <p className="mt-1 ps-6 text-slate-300">
          {localizedText(project.description, locale)}
        </p>
      )}
      <p className="mt-1 ps-6 font-mono text-sm text-slate-500">
        {(project.techStack ?? []).join(" | ")}
        {project.url && (
          <>
            {"  "}
            <a
              href={project.url}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 underline underline-offset-4"
            >
              {project.url.replace(/^https?:\/\//, "")}
            </a>
          </>
        )}
      </p>
    </div>
  );
}

const HEADINGS: Record<Locale, Record<string, string>> = {
  en: {
    experience: "## experience",
    education: "## education",
    projects: "## projects",
    skills: "## skills",
    languages: "## languages",
  },
  fr: {
    experience: "## expérience",
    education: "## formation",
    projects: "## projets",
    skills: "## compétences",
    languages: "## langues",
  },
  ar: {
    experience: "## الخبرة المهنية",
    education: "## التعليم",
    projects: "## المشاريع",
    skills: "## المهارات",
    languages: "## اللغات",
  },
};

export default function DeveloperPortfolio({ profile, locale }: Props) {
  const active: Locale = locale ?? profile.defaultLocale;
  const h = HEADINGS[active];
  const skillsByCategory = new Map<string, string[]>();
  for (const s of profile.skills ?? []) {
    if (!s.name) continue;
    const cat = s.category ?? "other";
    skillsByCategory.set(cat, [...(skillsByCategory.get(cat) ?? []), s.name]);
  }
  const projects = [...(profile.projects ?? [])].sort(
    (a, b) => Number(b.featured ?? false) - Number(a.featured ?? false),
  );

  return (
    <article
      lang={active}
      dir={isRTL(active) ? "rtl" : "ltr"}
      className="mx-auto max-w-2xl bg-slate-950 px-6 py-12 font-mono text-sm leading-relaxed"
    >
      <header>
        <p className="text-slate-500"># folio — {profile.id}</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-50">
          <Prompt />
          whoami: {profile.name}
        </h1>
        {profile.title && (
          <p className="mt-1 text-emerald-400">
            {localizedText(profile.title, active)}
          </p>
        )}
        <p className="mt-2 break-all text-slate-400">
          {[profile.location, profile.email, profile.phone]
            .filter(Boolean)
            .join(" | ")}
        </p>
        {(profile.socials ?? []).length > 0 && (
          <p className="mt-1 break-all text-slate-400">
            {(profile.socials ?? [])
              .map((s) => `${s.platform}: ${s.url}`)
              .join(" | ")}
          </p>
        )}
        {profile.summary && (
          <p className="mt-3 text-slate-300">
            <span className="text-slate-500">&gt; </span>
            {localizedText(profile.summary, active)}
          </p>
        )}
      </header>

      {profile.experiences && profile.experiences.length > 0 && (
        <section className="mt-8">
          <h2 className="font-bold text-slate-50">{h.experience}</h2>
          <div className="mt-3 space-y-4">
            {profile.experiences.map((exp) => (
              <ExpBlock key={exp.id} exp={exp} locale={active} />
            ))}
          </div>
        </section>
      )}

      {projects.length > 0 && (
        <section className="mt-8">
          <h2 className="font-bold text-slate-50">{h.projects}</h2>
          <div className="mt-3 space-y-4">
            {projects.map((p) => (
              <ProjectBlock key={p.id} project={p} locale={active} />
            ))}
          </div>
        </section>
      )}

      {skillsByCategory.size > 0 && (
        <section className="mt-8">
          <h2 className="font-bold text-slate-50">{h.skills}</h2>
          <div className="mt-3 space-y-1 text-slate-300">
            {[...skillsByCategory.entries()].map(([cat, names]) => (
              <p key={cat}>
                <span className="text-emerald-400">{cat}</span>
                <span className="text-slate-500">: </span>
                {names.join(", ")}
              </p>
            ))}
          </div>
        </section>
      )}

      {profile.education && profile.education.length > 0 && (
        <section className="mt-8">
          <h2 className="font-bold text-slate-50">{h.education}</h2>
          <div className="mt-3 space-y-2 text-slate-300">
            {profile.education.map((e) => {
              const dates = [e.startDate, e.present ? "present" : e.endDate]
                .filter(Boolean)
                .join(" – ");
              return (
                <p key={e.id}>
                  <Prompt />
                  {e.degree}
                  {e.school && (
                    <span className="text-slate-400"> @ {e.school}</span>
                  )}
                  {dates && <span className="text-slate-500"> [{dates}]</span>}
                </p>
              );
            })}
          </div>
        </section>
      )}

      {profile.languages && profile.languages.length > 0 && (
        <section className="mt-8">
          <h2 className="font-bold text-slate-50">{h.languages}</h2>
          <p className="mt-3 text-slate-300">
            {profile.languages
              .map(
                (l) =>
                  `${localizedText(l.name, active)}${l.level ? ` (${l.level})` : ""}`,
              )
              .join(" | ")}
          </p>
        </section>
      )}

      <p className="mt-8 text-slate-600">
        <Prompt />
        <span className="animate-pulse">▊</span>
      </p>
    </article>
  );
}
