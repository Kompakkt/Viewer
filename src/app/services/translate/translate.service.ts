import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, firstValueFrom, ReplaySubject } from 'rxjs';

export type TranslationData = Record<string, string | undefined>;

@Injectable()
export class TranslateService {
  private requestedLanguage$ = new BehaviorSubject<string | undefined>(undefined);
  private languageData$ = new BehaviorSubject<TranslationData>({});

  // TODO: Extract this data when necessary
  private missingTranslations = new Set<string>();

  public selectedLanguage$ = new ReplaySubject<string>(1);
  public supportedLanguages = {
    en: 'English',
    mn: 'монгол хэл (Mongolian)',
  };

  constructor(
    private http: HttpClient,
    private router: Router,
    private activatedRoute: ActivatedRoute,
  ) {
    this.requestedLanguage$.subscribe(requestedLanguage => {
      const supportedLanguage = this.getSupportedLanguage(requestedLanguage);
      this.getTranslationData(supportedLanguage)
        .then(data => {
          console.log('Loaded translation data', { requestedLanguage, supportedLanguage, data });
          this.languageData$.next(data);
          this.selectedLanguage$.next(supportedLanguage);
        })
        .catch(err =>
          console.error('Could not load translation data:', {
            requestedLanguage,
            supportedLanguage,
            err,
          }),
        );
    });

    this.selectedLanguage$.subscribe(() => {
      this.addLocaleToSearchParams();
    });
  }

  private async addLocaleToSearchParams() {
    const locale = await firstValueFrom(this.selectedLanguage$);
    const windowQueryParams = new URLSearchParams(window.location.search);
    const queryParams = {
      ...Object.fromEntries(windowQueryParams.entries()),
      ...this.router.getCurrentNavigation()?.extras.state,
      locale: locale,
    };

    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: queryParams,
      queryParamsHandling: 'merge',
    });
  }

  public getTranslatedKey(key: string) {
    const translation = this.languageData$.getValue()[key];
    if (!translation) {
      this.missingTranslations.add(key);
      return key;
    }
    return translation;
  }

  public requestLanguage(requestedLanguage?: string) {
    this.requestedLanguage$.next(requestedLanguage);
  }

  private getSupportedLanguage(requestedLanguage?: string): string {
    const supportedLanguages = Object.keys(this.supportedLanguages);

    const queryLanguage = new URLSearchParams(location.search).get('locale');
    // Remove navigator language detection for now, until translations are more mature
    // const navigatorLanguage = window.navigator.language.split('-').at(0);

    // Find the first supported language or fallback to English
    const supportedLanguage =
      [requestedLanguage, queryLanguage].find(
        language => language && supportedLanguages.includes(language),
      ) ?? 'en';
    return supportedLanguage;
  }

  private async getTranslationData(language: string): Promise<TranslationData> {
    const path = `assets/i18n/${language}.json`;

    try {
      return await firstValueFrom(this.http.get<TranslationData>(path));
    } catch (e) {
      console.log('Could not load translation', e);
    }
    return {};
  }
}
