import { inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '../translate/translate.service';

@Injectable({ providedIn: 'root' })
export class LoadingScreenService {
  #translate = inject(TranslateService);
  opacity = signal<string>('1');
  loadingText = signal<string>(this.#translate.getTranslation('k_loadingscreen-text', { percentage: 0 }));
  isLoading = signal(false);

  show() {
    this.updateOpacity('1');
  }

  hide() {
    this.updateOpacity('0');
  }

  updateOpacity(newOpacity: string): void {
    if (parseFloat(newOpacity) > 0.5) {
      this.isLoading.set(true);
    } else {
      this.isLoading.set(false);
    }
    this.opacity.set(newOpacity);
  }

  updateLoadingPercentage(percentage: number): void {
    this.loadingText.set(      this.#translate.getTranslation('k_loadingscreen-text', { percentage })    );
  }
}
