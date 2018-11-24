import {Injectable} from '@angular/core';
import {Model} from '../../interfaces/model/model.interface';
import {BabylonService} from '../babylon/babylon.service';
import {MongohandlerService} from '../mongohandler/mongohandler.service';
import {Annotation} from '../../interfaces/annotation/annotation';
import {forEach} from '@angular/router/src/utils/collection';
import {BehaviorSubject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CatalogueService {

  private Subjects = {
    model: new BehaviorSubject<Model>(null),
    quality: new BehaviorSubject<string>('low'),
    models: new BehaviorSubject<Model[]>(Array<Model>())
  };
  public Observables = {
    model: this.Subjects.model.asObservable(),
    quality: this.Subjects.quality.asObservable(),
    models: this.Subjects.models.asObservable()
  };
  private unsortedModels: Model[];


  constructor(private mongohandlerService: MongohandlerService) {
    this.fetchData();
  }

  public updateQuality(quality: string) {
    this.Subjects.quality.next(quality);
  }

  public updateActiveModel(model: Model) {
    this.Subjects.model.next(model);
  }

  public initializeCatalogue() {
    let models = this.Observables.models.source['value'];

    this.unsortedModels = models.slice(0);
    models.splice(0, models.length);
    models = this.unsortedModels.slice(0);

    models.sort((leftSide, rightSide): number => {
      if (+leftSide.ranking < +rightSide.ranking) {
        return -1;
      }
      if (+leftSide.ranking > +rightSide.ranking) {
        return 1;
      }
      return 0;
    });

    this.Subjects.models.next(models);
  }

  private async fetchData() {
    const compilation = await this.mongohandlerService.getCompilation('testcompilation2').then(result => {
      return result;
    }).catch(error => console.error(error));
    if (compilation.models.length > 0) {
      this.Subjects.models.next(compilation.models);
      this.updateActiveModel(compilation.models[0]);
    }
  }
}
