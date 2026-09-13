import type { ComponentType } from "react";
import type { Locale, Profile } from "@folial/schema";
import MinimalistPortfolio from "./minimalist/MinimalistPortfolio";
import DeveloperPortfolio from "./developer/DeveloperPortfolio";
import CorporatePortfolio from "./corporate/CorporatePortfolio";

export interface ThemeProps {
  profile: Profile;
  locale?: Locale;
}

export interface ThemeDef {
  id: string;
  name: string;
  Component: ComponentType<ThemeProps>;
}

export const THEMES: ThemeDef[] = [
  { id: "minimalist", name: "Minimalist", Component: MinimalistPortfolio },
  { id: "developer", name: "Developer", Component: DeveloperPortfolio },
  { id: "corporate", name: "Corporate", Component: CorporatePortfolio },
];

export const DEFAULT_THEME_ID = "minimalist";

export function getTheme(themeId: string | undefined): ThemeDef {
  return THEMES.find((t) => t.id === themeId) ?? THEMES[0];
}