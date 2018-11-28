import { Component, Input, OnInit } from '@angular/core';
import { Model } from '../../interfaces/model/model.interface';
import { CatalogueService } from '../../services/catalogue/catalogue.service';
import { LoadModelService } from '../../services/load-model/load-model.service';


@Component({
  selector: 'app-model',
  templateUrl: './model.component.html',
  styleUrls: ['./model.component.css']
})
export class ModelComponent implements OnInit {
  @Input() model: Model;

  constructor(private catalogueService: CatalogueService,
              private loadModelService: LoadModelService) {
  }

  ngOnInit() {
    this.catalogueService.Observables.quality.subscribe((result) => {
      this.catalogueService.updateActiveModel(this.catalogueService.Observables.model.source['_value']);
    });
    this.catalogueService.Observables.model.subscribe(async (result) => this.loadModel(result));
  }

  public async changeModel() {
    this.catalogueService.updateActiveModel(this.model);
  }

  public loadModel(newModel: Model) {
    this.loadModelService.loadModel(newModel);
  }
}
