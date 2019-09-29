import {
  Component,
  OnInit,
} from '@angular/core';

import {ICompilation, IEntity} from '../../interfaces/interfaces';
import { ProcessingService } from '../../services/processing/processing.service';

@Component({
  selector: 'compilation-browser',
  templateUrl: './compilation-browser.component.html',
  styleUrls: ['./compilation-browser.component.scss'],
})
export class CompilationBrowserComponent implements OnInit {

  public compilation: ICompilation | undefined;
  public entity: IEntity | undefined;

  constructor(
    public processingService: ProcessingService,
  ) {}

  ngOnInit() {
    this.processingService.Observables.actualCompilation.subscribe(compilation => {
      this.compilation = compilation;
    });

    this.processingService.Observables.actualEntity.subscribe(entity => {
      this.entity = entity;
    });
  }
}
