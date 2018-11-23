import {Injectable} from '@angular/core';
import {Model} from '../../interfaces/model/model.interface';
import {BabylonService} from '../babylon/babylon.service';
import {MongohandlerService} from '../mongohandler/mongohandler.service';
import {Annotation} from '../../interfaces/annotation/annotation';
import {forEach} from '@angular/router/src/utils/collection';

@Injectable({
  providedIn: 'root'
})
export class CatalogueService {

  public activeModel: Model;
  public models: Model[];
  private unsortedModels: Model[];


  constructor(private mongohandlerService: MongohandlerService) {
    console.log(this.mongohandlerService.getCompilation('testcompilation'));
    this.models = this.fetchData();

  }


  public initializeCatalogue() {

    this.unsortedModels = this.models.slice(0);
    this.models.splice(0, this.models.length);
    this.models = this.unsortedModels.slice(0);

    this.models.sort((leftSide, rightSide): number => {
      if (+leftSide.ranking < +rightSide.ranking) {
        return -1;
      }
      if (+leftSide.ranking > +rightSide.ranking) {
        return 1;
      }
      return 0;
    });
  }

  private fetchData(): Array<any> {
    const annotationList: Array<any> = [];
    console.log(this.mongohandlerService.getCompilation('testcompilation2'));
    this.mongohandlerService.getCompilation('testcompilation2').then(result => {

      result.models.forEach(function (value) {
        annotationList.push(value);
      });

      console.log(annotationList);

    }, error => {
      console.error(error);
    });

    return annotationList;
  }

}
