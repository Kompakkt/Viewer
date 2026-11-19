import { HttpClient } from '@angular/common/http';
import {
  computed,
  effect,
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
  Service,
  signal,
} from '@angular/core';
import { FluentBundle, FluentResource } from '@fluent/bundle';
import { first } from 'rxjs';

export type TranslateConfig = {
  defaultLocale: string;
  sources: Record<string, string>;
};

@Service()
export class TranslateService {
  #http = inject(HttpClient);
  #requestedLocale = signal<string>('en');
  locale = computed(() => this.#requestedLocale());
  defaultLocale = signal<string>('en');
  sourceMap = signal<Record<string, string>>({});
  bundleMap = signal<Record<string, FluentBundle>>({});

  _requestLocaleChanged = effect(() => {
    const requestedLocale = this.#requestedLocale();
    void this.#loadLocale(requestedLocale);
  });

  _sourceMapChanged = effect(() => {
    const map = this.sourceMap();
    void this.#loadFromSources(map);
  });

  async #loadFromSources(sources: Record<string, string>) {
    const defaultLocale = this.defaultLocale();
    await this.#loadLocale(defaultLocale);
    const otherLocales = Object.keys(sources).filter(locale => locale !== defaultLocale);
    for (const locale of otherLocales) {
      await this.#loadLocale(locale);
    }
  }

  async #loadLocale(locale: string) {
    const sources = this.sourceMap();
    if (!sources[locale]) {
      console.warn(
        '[TranslateService] Requested locale does not exist in sourceMap, returning to defaultLocale',
      );
      this.#requestedLocale.set(this.defaultLocale());
      return;
    }

    const bundles = this.bundleMap();
    if (bundles[locale]) {
      console.log('[TranslateService] Requested locale already loaded');
      return;
    }

    this.#http
      .get(sources[locale], { responseType: 'text' })
      .pipe(first())
      .subscribe(content => {
        if (!content) return;
        console.log('[TranslateService] Got content', content);
        const resource = new FluentResource(content);
        const bundle = new FluentBundle(locale);
        bundle.addResource(resource);
        this.bundleMap.update(map => {
          return { ...map, [locale]: bundle };
        });
      });
  }

  requestLanguage(locale: string) {
    const sources = this.sourceMap();
    if (!sources[locale]) {
      console.warn('[TranslateService] Requested locale is not available in sources');
      return;
    }
    this.#requestedLocale.set(locale);
  }

  addResource(locale: string, resource: FluentResource) {
    this.bundleMap.update(map => {
      map[locale].addResource(resource);
      return { ...map };
    });
  }

  getTranslation(key: string, args?: any) {
    const bundles = this.bundleMap();
    const locale = this.#requestedLocale();
    const defaultLocale = this.defaultLocale();
    const localeBundle: FluentBundle | undefined = bundles[locale];
    const defaultBundle: FluentBundle | undefined = bundles[defaultLocale];
    if (!localeBundle && !defaultBundle) {
      console.log('[TranslateService] No bundle ready for request', { key, args });
      return key;
    }

    const translatedKey = (() => {
      fromLocale: {
        const message = localeBundle?.getMessage(key);
        const value = message?.value;
        if (value) {
          const translated = localeBundle?.formatPattern(value, args);
          return translated;
        }
        break fromLocale;
      }
      fromDefault: {
        const message = defaultBundle?.getMessage(key);
        const value = message?.value;
        if (value) {
          const translated = defaultBundle?.formatPattern(value, args);
          return translated;
        }
        break fromDefault;
      }
      return key;
    })();

    return translatedKey;
  }
}

export const provideTranslateService = (config: TranslateConfig): EnvironmentProviders => {
  return makeEnvironmentProviders([
    provideAppInitializer(() => {
      const service = inject(TranslateService);
      if (config.defaultLocale) service.defaultLocale.set(config.defaultLocale);
      if (config.sources) service.sourceMap.set(config.sources);
    }),
  ]);
};
