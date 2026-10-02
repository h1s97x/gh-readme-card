/** Used when a card does not ask for a locale, or asks for an unknown one. */
const FALLBACK_LOCALE = "en";

/** A translation table: key -> locale code -> translated string. */
export type Translations = Record<string, Record<string, string>>;

export interface I18nOptions {
  locale?: string;
  translations: Translations;
}

/**
 * Looks strings up in a translation table, one locale at a time.
 */
class I18n {
  private locale: string;
  private translations: Translations;

  /**
   * @param options Locale and the table to read from.
   */
  constructor({ locale, translations }: I18nOptions) {
    this.locale = locale || FALLBACK_LOCALE;
    this.translations = translations;
  }

  /**
   * Translate a key.
   *
   * Throws rather than returning the key: a missing string means the card would
   * render a raw identifier, which is worse than a failed build.
   *
   * @param str Key to translate.
   * @returns The translated string.
   */
  t(str: string): string {
    const entry = this.translations[str];
    if (!entry) {
      throw new Error(`${str} Translation string not found`);
    }

    const translated = entry[this.locale];
    if (!translated) {
      throw new Error(
        `'${str}' translation not found for locale '${this.locale}'`,
      );
    }

    return translated;
  }
}

export { I18n, FALLBACK_LOCALE };
export default I18n;
