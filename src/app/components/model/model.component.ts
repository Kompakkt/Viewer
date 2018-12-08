import {Component, Input, OnInit} from '@angular/core';
import {Model} from '../../interfaces/model/model.interface';
import {CatalogueService} from '../../services/catalogue/catalogue.service';
import {LoadModelService} from '../../services/load-model/load-model.service';
import {OverlayService} from '../../services/overlay/overlay.service';


@Component({
  selector: 'app-model',
  templateUrl: './model.component.html',
  styleUrls: ['./model.component.scss']
})
export class ModelComponent implements OnInit {
  @Input() model: Model;

  constructor(private catalogueService: CatalogueService,
              private loadModelService: LoadModelService,
              private overlayService: OverlayService) {
  }

  ngOnInit() {

    this.catalogueService.Observables.quality.subscribe((result) =>
      this.loadModelService.loadModel(this.catalogueService.Observables.model.source['_value'], result));
    this.catalogueService.Observables.model.subscribe((result) =>
      this.loadModelService.loadModel(result, this.catalogueService.Observables.quality.source['value']));
  }

  public async changeModel() {

    this.catalogueService.updateActiveModel(this.model);
    this.overlayService.closeCollectionsOverview();
    this.overlayService.closeEditor();
  }
}
