import {Component, Input, OnInit} from '@angular/core';
import {Model} from '../../interfaces/model/model.interface';
import {CatalogueService} from '../../services/catalogue/catalogue.service';
import {LoadModelService} from '../../services/load-model/load-model.service';

@Component({
  selector: 'app-model',
  templateUrl: './model.component.html',
  styleUrls: ['./model.component.scss']
})
export class ModelComponent implements OnInit {

  @Input() model: Model;

  constructor(private catalogueService: CatalogueService,
              private loadModelService: LoadModelService) {
  }

  ngOnInit() {
  }

  public async changeModel() {
    this.loadModelService.loadModel(this.model);
  }
}
