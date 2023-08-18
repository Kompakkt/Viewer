import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

export type TranslationData = Record<string, string | undefined>;

@Injectable()
export class TranslateService {
  private requestedLanguage$ = new BehaviorSubject<string | undefined>(undefined);
  private languageData$ = new BehaviorSubject<TranslationData>({});

  constructor(private http: HttpClient) {
    this.requestedLanguage$.subscribe(requestedLanguage => {
      const supportedLanguage = this.getSupportedLanguage(requestedLanguage);
      this.getTranslationData(supportedLanguage)
        .then(data => {
          console.log('Loaded translation data', { requestedLanguage, supportedLanguage, data });
          this.languageData$.next(data);
        })
        .catch(err =>
          console.error('Could not load translation data:', {
            requestedLanguage,
            supportedLanguage,
            err,
          }),
        );
    });
  }

  public getTranslatedKey(key: string) {
    const translation = this.languageData$.getValue()[key];
    if (!translation) {
      console.debug('No translation for', key);
      return key;
    }
    return translation;
  }

  public async requestLanguage(requestedLanguage?: string) {
    this.requestedLanguage$.next(requestedLanguage);
  }

  private getSupportedLanguage(requestedLanguage?: string): string {
    const supportedLanguages = ['en', 'de', 'mn', 'el', 'it'];

    const queryLanguage = new URLSearchParams(location.search).get('locale');
    const navigatorLanguage = window.navigator.language.split('-').at(0);

    // Find the first supported language or fallback to English
    const supportedLanguage =
      [requestedLanguage, queryLanguage, navigatorLanguage].find(
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