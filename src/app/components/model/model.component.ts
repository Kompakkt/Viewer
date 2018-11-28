import { Component, Input, OnInit } from '@angular/core';
import { Model } from '../../interfaces/model/model.interface';
import { BabylonService } from '../../services/babylon/babylon.service';
import * as BABYLON from 'babylonjs';
import { ActionService } from '../../services/action/action.service';
import { AnnotationService } from '../../services/annotation/annotation.service';
import { CameraService } from '../../services/camera/camera.service';
import { CatalogueService } from '../../services/catalogue/catalogue.service';
import { LoadingscreenhandlerService } from '../../services/loadingscreenhandler/loadingscreenhandler.service';
import { LoadModelService } from '../../services/load-model/load-model.service';


@Component({
  selector: 'app-model',
  templateUrl: './model.component.html',
  styleUrls: ['./model.component.css']
})
export class ModelComponent implements OnInit {
  @Input() model: Model;

  private actualModelName: string;

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
