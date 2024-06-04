import { Directive, ElementRef, inject } from '@angular/core';

@Directive({
  selector: 'img[appFallbackImage]',
  standalone: true,
})
export class FallbackImageDirective {
  #ref = inject(ElementRef);

  constructor() {
    const el = this.#ref.nativeElement as HTMLImageElement;
    el.addEventListener(
      'error',
      () => {
        console.log(`Failed to load ${el.src}, falling back`);
        el.src = 'assets/image-not-found.png';
      },
      { once: true },
    );
  }
}
