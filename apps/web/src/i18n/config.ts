export const locales = ["ko", "en"] as const;
export const defaultLocale = "ko";
export type Locale = (typeof locales)[number];

export function isLocale(value: string): value is Locale {
  return locales.some((locale) => locale === value);
}
