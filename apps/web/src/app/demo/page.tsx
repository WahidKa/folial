import { sampleProfile, type Locale } from "@folial/schema";
import MinimalistPortfolio from "@/themes/minimalist/MinimalistPortfolio";
import { THEMES } from "@/themes/registry";

const LOCALES: Locale[] = ["en", "fr", "ar"];

export default function DemoPage() {
  return (
    <main>
      {THEMES.map((theme) => (
        <div key={theme.id}>
          <p className="mx-auto max-w-2xl px-6 pt-8 text-xs uppercase tracking-widest text-zinc-400">
            Theme · {theme.name}
          </p>
          <theme.Component profile={sampleProfile} />
        </div>
      ))}
      {LOCALES.map((locale) => (
        <div key={locale} className="border-b border-dashed border-zinc-300">
          <p className="mx-auto max-w-2xl px-6 pt-8 text-xs uppercase tracking-widest text-zinc-400">
            Minimalist · {locale}
          </p>
          <MinimalistPortfolio profile={sampleProfile} locale={locale} />
        </div>
      ))}
    </main>
  );
}
