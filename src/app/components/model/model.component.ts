import {Component, Input, OnInit} from '@angular/core';

import {IModel} from '../../interfaces/interfaces';
import {CatalogueService} from '../../services/catalogue/catalogue.service';

@Component({
  selector: 'app-model',
  templateUrl: './model.component.html',
  styleUrls: ['./model.component.scss'],
})
export class ModelComponent implements OnInit {

  @Input() model: IModel;

  constructor(private catalogueService: CatalogueService) {
  }

  ngOnInit() {
  }

  public async changeModel() {
    if (this.model._id) {
      this.catalogueService.selectModel(this.model._id, undefined);
    }
  }
}
