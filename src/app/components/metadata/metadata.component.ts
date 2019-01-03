import { Component, OnInit } from '@angular/core';
import {CatalogueService} from '../../services/catalogue/catalogue.service';

@Component({
  selector: 'app-metadata',
  templateUrl: './metadata.component.html',
  styleUrls: ['./metadata.component.scss']
})
export class MetadataComponent implements OnInit {


  constructor(public catalogueService: CatalogueService) {
  }

  ngOnInit() {
  }
}

