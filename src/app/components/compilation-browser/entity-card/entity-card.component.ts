import { Component, Input } from '@angular/core';
import { ProcessingService } from 'src/app/services/processing/processing.service';
import { IDigitalEntity, IEntity } from '~common/interfaces';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-compilation-browser-entity-card',
  templateUrl: './entity-card.component.html',
  styleUrls: ['./entity-card.component.scss'],
})
export class CompilationBrowserEntityCardComponent {
  @Input('entity') public entity?: IEntity;
  @Input('isSelected') public isSelected = false;

  get previewImage() {
    return environment.server_url + this.entity!.settings.preview;
  }

  get bgColor() {
    return this.entity!.settings.background.color;
  }

  get digitalEntity() {
    return this.entity!.relatedDigitalEntity as IDigitalEntity;
  }

  constructor(public processing: ProcessingService) {}
}
