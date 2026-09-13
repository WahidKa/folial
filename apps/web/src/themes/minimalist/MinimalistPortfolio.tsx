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

function formatDates(exp: Experience): string {
  const range = [exp.startDate, exp.present ? "present" : exp.endDate]
    .filter(Boolean)
    .join(" – ");
  return range;
}

function ExperienceItem({
  exp,
  locale,
}: {
  exp: Experience;
  locale: Locale;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-zinc-900">
          {localizedText(exp.role, locale)}
          {exp.company && (
            <span className="font-normal text-zinc-500">
              {" "}
              · {exp.company}
            </span>
          )}
        </h3>
        {formatDates(exp) && (
          <span className="text-sm text-zinc-500">{formatDates(exp)}</span>
        )}
      </div>
      {exp.bullets && exp.bullets.length > 0 && (
        <ul className="mt-1 list-disc space-y-1 ps-5 text-zinc-700">
          {exp.bullets.map((b, i) => (
            <li key={i}>{localizedText(b, locale)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProjectItem({ project, locale }: { project: Project; locale: Locale }) {
  const title = localizedText(project.title, locale);
  return (
    <div>
      <h3 className="font-semibold text-zinc-900">
        {project.url ? (
          <a
            href={project.url}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-600"
          >
            {title}
          </a>
        ) : (
          title
        )}
        {project.featured && (
          <span className="ms-2 rounded-full bg-zinc-900 px-2 py-0.5 align-middle text-xs font-medium text-white">
            Featured
          </span>
        )}
      </h3>
      {project.description && (
        <p className="mt-1 text-zinc-700">
          {localizedText(project.description, locale)}
        </p>
      )}
      {project.techStack && project.techStack.length > 0 && (
        <p className="mt-1 text-sm text-zinc-500">{project.techStack.join(" · ")}</p>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="border-b border-zinc-200 pb-2 text-sm font-semibold uppercase tracking-widest text-zinc-500">
        {title}
      </h2>
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  );
}

const SECTION_TITLES: Record<Locale, Record<string, string>> = {
  en: {
    experience: "Experience",
    education: "Education",
    projects: "Projects",
    skills: "Skills",
    languages: "Languages",
  },
  fr: {
    experience: "Expérience",
    education: "Formation",
    projects: "Projets",
    skills: "Compétences",
    languages: "Langues",
  },
  ar: {
    experience: "الخبرة المهنية",
    education: "التعليم",
    projects: "المشاريع",
    skills: "المهارات",
    languages: "اللغات",
  },
};

export default function MinimalistPortfolio({ profile, locale }: Props) {
  const active: Locale = locale ?? profile.defaultLocale;
  const t = SECTION_TITLES[active];
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
      className="mx-auto max-w-2xl px-6 py-12"
    >
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950">
          {profile.name}
        </h1>
        {profile.title && (
          <p className="mt-1 text-lg text-zinc-600">
            {localizedText(profile.title, active)}
          </p>
        )}
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500">
          {profile.location && <span>{profile.location}</span>}
          {profile.email && (
            <a href={`mailto:${profile.email}`} className="underline underline-offset-4">
              {profile.email}
            </a>
          )}
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
        </p>
        {profile.summary && (
          <p className="mt-4 leading-relaxed text-zinc-700">
            {localizedText(profile.summary, active)}
          </p>
        )}
      </header>

      {profile.experiences && profile.experiences.length > 0 && (
        <Section title={t.experience}>
          {profile.experiences.map((exp) => (
            <ExperienceItem key={exp.id} exp={exp} locale={active} />
          ))}
        </Section>
      )}

      {projects.length > 0 && (
        <Section title={t.projects}>
          {projects.map((p) => (
            <ProjectItem key={p.id} project={p} locale={active} />
          ))}
        </Section>
      )}

      {skillsByCategory.size > 0 && (
        <Section title={t.skills}>
          {[...skillsByCategory.entries()].map(([cat, names]) => (
            <p key={cat} className="text-zinc-700">
              <span className="font-semibold text-zinc-900">{cat}: </span>
              {names.join(", ")}
            </p>
          ))}
        </Section>
      )}

      {profile.education && profile.education.length > 0 && (
        <Section title={t.education}>
          {profile.education.map((e) => {
            const dates = [e.startDate, e.present ? "present" : e.endDate]
              .filter(Boolean)
              .join(" – ");
            return (
              <div key={e.id}>
                <h3 className="font-semibold text-zinc-900">
                  {e.degree}
                  {e.school && (
                    <span className="font-normal text-zinc-500">
                      {" "}
                      · {e.school}
                    </span>
                  )}
                </h3>
                {dates && <p className="text-sm text-zinc-500">{dates}</p>}
              </div>
            );
          })}
        </Section>
      )}

      {profile.languages && profile.languages.length > 0 && (
        <Section title={t.languages}>
          <p className="text-zinc-700">
            {profile.languages
              .map(
                (l) =>
                  `${localizedText(l.name, active)}${l.level ? ` (${l.level})` : ""}`,
              )
              .join(" · ")}
          </p>
        </Section>
      )}
    </article>
  );
}
