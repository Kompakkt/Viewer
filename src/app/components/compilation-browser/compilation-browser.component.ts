import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { MatCard, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { filter, map } from 'rxjs';
import { isCompilation, isEntity } from 'src/common';
import { environment } from 'src/environment';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ProcessingService } from '../../services/processing/processing.service';

@Component({
  selector: 'app-compilation-browser',
  templateUrl: './compilation-browser.component.html',
  styleUrls: ['./compilation-browser.component.scss'],
  standalone: true,
  imports: [MatCard, MatCardHeader, MatCardTitle, AsyncPipe, TranslatePipe],
})
export class CompilationBrowserComponent {
  public server_url = environment.server_url;

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
