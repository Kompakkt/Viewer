export const languageNames = {
  en: 'English',
  de: 'Deutsch (German)',
  fr: 'Français (French)',
  it: 'Italiano (Italian)',
  es: 'Español (Spanish)',
  mn: 'монгол хэл (Mongolian)',
} as const;

export type LanguageKey = keyof typeof languageNames;

export const languageSources = {
  en: 'assets/i18n/en.ftl',
  de: 'assets/i18n/de.ftl',
  fr: 'assets/i18n/fr.ftl',
  it: 'assets/i18n/it.ftl',
  es: 'assets/i18n/es.ftl',
  mn: 'assets/i18n/mn.ftl',
} as const satisfies Partial<Record<LanguageKey, `assets/i18n/${string}.ftl`>>;
