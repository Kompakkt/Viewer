import { Component, effect, inject, signal } from '@angular/core';
import { combineLatest, first, fromEvent, merge, zip } from 'rxjs';
import { LoadingScreenService } from 'src/app/services/babylon/loadingscreen';

@Component({
  selector: 'app-guide',
  templateUrl: './guide.component.html',
  styleUrls: ['./guide.component.scss'],
  standalone: true,
  host: {
    '[class.visible]': 'isVisible()',
  },
})
export class GuideComponent {
  isVisible = signal(false);
  #loadingScreen = inject(LoadingScreenService);

  constructor() {
    let effectRef = effect(() => {
      const isLoading = this.#loadingScreen.isLoading();
      if (isLoading) return;
      this.#showGuide();
      effectRef.destroy();
    });
  }

  #showGuide() {
    if (this.isVisible()) return;

    const hasBeenShown = !!localStorage.getItem('hasKompakktGuideBeenShown');
    if (hasBeenShown) return;
    localStorage.setItem('hasKompakktGuideBeenShown', new Date().toISOString());

    console.log('GuideComponent: Loading complete, showing guide in 1 second...');
    setTimeout(() => {
      this.isVisible.set(true);
      merge(
        fromEvent(document, 'click'),
        fromEvent(document, 'tap'),
        fromEvent(document, 'keydown'),
        fromEvent(document, 'touchstart'),
        fromEvent(document, 'mousedown'),
      )
        .pipe(first())
        .subscribe(() => {
          this.isVisible.set(false);
        });
    }, 0);
  }
}
