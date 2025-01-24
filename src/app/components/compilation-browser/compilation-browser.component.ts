import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { MatCard, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { filter, map } from 'rxjs';
import { FixImageUrlPipe } from 'src/app/pipes/fix-image-url.pipe';
import { isCompilation, isEntity } from 'src/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ProcessingService } from '../../services/processing/processing.service';

@Component({
    selector: 'app-compilation-browser',
    templateUrl: './compilation-browser.component.html',
    styleUrls: ['./compilation-browser.component.scss'],
    imports: [MatCard, MatCardHeader, MatCardTitle, AsyncPipe, TranslatePipe, FixImageUrlPipe]
})
export class CompilationBrowserComponent {
  public colorToRGBA = (colorString: { r: number; g: number; b: number; a: number }) => {
    return `rgba(${colorString.r}, ${colorString.g}, ${colorString.b}, ${colorString.a})`;
  };

  constructor(public processing: ProcessingService) {}

  get compilation$() {
    return this.processing.compilation$;
  }

  get entity$() {
    return this.processing.entity$;
  }

  get entities$() {
    return this.compilation$.pipe(
      filter(isCompilation),
      map(({ entities }) => Object.values(entities)),
      map(entities => entities.filter(isEntity)),
    );
  }
}
