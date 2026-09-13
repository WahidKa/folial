import { sampleProfile, type Locale } from "@folial/schema";
import MinimalistPortfolio from "@/themes/minimalist/MinimalistPortfolio";

const LOCALES: Locale[] = ["en", "fr", "ar"];

export default function DemoPage() {
  return (
    <main>
      {LOCALES.map((locale) => (
        <div key={locale} className="border-b border-dashed border-zinc-300">
          <p className="mx-auto max-w-2xl px-6 pt-8 text-xs uppercase tracking-widest text-zinc-400">
            Preview · {locale}
          </p>
          <MinimalistPortfolio profile={sampleProfile} locale={locale} />
        </div>
      ))}
    </main>
  );
}
