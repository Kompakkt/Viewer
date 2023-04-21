import { Component } from '@angular/core';
import { filter, map } from 'rxjs';
import { IDigitalEntity, isCompilation, isDigitalEntity, isEntity } from 'src/common';
import { environment } from 'src/environments/environment';
import { ProcessingService } from '../../services/processing/processing.service';

@Component({
  selector: 'app-compilation-browser',
  templateUrl: './compilation-browser.component.html',
  styleUrls: ['./compilation-browser.component.scss'],
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

  get digitalEntity$() {
    return this.entity$.pipe(
      map(entity => entity?.relatedDigitalEntity),
      filter(digitalEntity => isDigitalEntity(digitalEntity)),
      map(digitalEntity => digitalEntity as IDigitalEntity),
    );
  }

  get entities$() {
    return this.compilation$.pipe(
      filter(isCompilation),
      map(({ entities }) => Object.values(entities)),
      map(entities => entities.filter(isEntity)),
    );
  }
}
