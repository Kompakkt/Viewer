import {Injectable} from '@angular/core';
import {Annotation} from 'src/app/interfaces/annotation/annotation';
import {DataService} from '../data/data.service';
import {BabylonService} from '../babylon/babylon.service';
import {ActionService} from '../action/action.service';
import {AnnotationmarkerService} from '../annotationmarker/annotationmarker.service';

import {ActionManager} from 'babylonjs';
import {Model} from '../../interfaces/model/model.interface';
import PouchDB from 'pouchdb';
import * as BABYLON from "babylonjs";
import {LoadModelService} from '../load-model/load-model.service';

/**
 * @author Zoe Schubert
 * @author Jan G. Wieners
 */

@Injectable({
  providedIn: 'root'
})

export class AnnotationService {

  public annotations: Annotation[];
  private unsortedAnnotations: Annotation[];
  private allAnnotations: Annotation[];
  private modelName: string;
  private initialLoading: boolean;
  private actualModelMesh: BABYLON.Mesh;
  private isDefaultLoad: boolean;

  constructor(private babylonService: BabylonService,
              private dataService: DataService,
              private actionService: ActionService,
              private annotationmarkerService: AnnotationmarkerService,
              private loadModelService: LoadModelService) {
    this.initialLoading = true;
    this.annotations = [];
    this.loadModelService.Observables.actualModel.subscribe(actualModel => {
      this.modelName = actualModel.name;
    });
    this.loadModelService.Observables.actualModelMesh.subscribe(actualModelMesh => {
      this.actualModelMesh = actualModelMesh;
      this.loadAnnotations();
    });
    this.loadModelService.defaultLoad.subscribe(defaultLoad => {
      this.isDefaultLoad = defaultLoad;
    });
  }

  public async loadAnnotations() {

    BABYLON.Tags.AddTagsTo(this.actualModelMesh, this.modelName);

    // Der modelName wird beim Laden eines neuen Modells übergeben und hier gespeichert,
    // um auch als Referenz für eine neu erstellte Annotation nutzbar zu sein
    // this.modelName = modelName;

    // In diesem Array sollten alle Annotationen in der richtigen Reihenfolge liegen, die visuell für das aktuelle
    // Model relevant sind, zu Beginn also erstmal keine
    this.annotations = [];

    // Hier werden die Annotationen unsortiert rein geworfen, wenn sie aus der Datenbank kommen
    this.unsortedAnnotations = [];

    // Alle Marker, die eventuell vom vorherigen Modell noch da sind, sollen gelöscht werden
    await this.annotationmarkerService.deleteAllMarker();

    // Beim ersten Laden eines Mdoells, werden alle in der PuchDB vorhandenen Annotationen in
    // das Array "allAnnotations" geladen
    if (this.initialLoading === true && this.isDefaultLoad === false) {
      await this.getAnnotations();
    } else {
      this.allAnnotations = [];
      this.allAnnotations.push(this.createDefaultAnnotation());
    }

    // Die Annotationen, die sich auf das aktuelle Model beziehen (also als relatedModel den Namen
    // des aktuellen Models aufweisen, werden raus gesucht und in das Array für unsortierte Annotationen
    // gepusht, da sie dort liegen ohne visuelle Elemente zu erzeugen
    await this.getActualAnnotations(this.modelName);

    // Jetzt sollen die Annotationen sortiert werden und in der richtigen Reihenfolge in das Array geschrieben werden
    // Achtung: dann gibt es auch direkt einen visuellen Output durch die Components!
    // Da die Labels erst im nächsten Schritt gezeichnet werden, hängen die Fenster der Annotationen dann kurz ohne Position
    // in der oberen linken Ecke.
    // Die Labels werden gezeichnet und die Fenster haben nun einen Orientierungspunkt
    await this.sortAnnotations();

    // Das neu geladene Modell wird annotierbar, ist aber noch nicht klickbar -> das soll erst passieren,
    // wenn der Edit-Mode aufgerufen wird
    // this.initializeAnnotationMode(modelName);
    // this.actionService.pickableModel(modelName, false);
    this.initializeAnnotationMode();

  }


  private async getActualAnnotations(modelName: string) {
    for (const annotation of this.allAnnotations) {
      if (annotation.relatedModel === modelName) {
        this.unsortedAnnotations.push(annotation);
      }
    }
  }

  private async getAnnotations() {
    this.allAnnotations = [];
    this.allAnnotations = await this.fetchData();
    this.initialLoading = false;
  }

  // Das aktuelle Modell wird anklickbar und damit annotierbar
  public annotationMode(value: boolean) {
    this.actionService.pickableModel(this.actualModelMesh, value);
  }

  // Die Annotationsfunktionalität wird zum aktuellen Modell hinzugefügt
  public initializeAnnotationMode() {
    this.actionService.createActionManager(this.actualModelMesh, ActionManager.OnDoublePickTrigger, this.createNewAnnotation.bind(this));
    this.annotationMode(false);
  }

  // Die Annotationen werden in der richtigen Reihenfolge in das Array für den visuellen Output geschrieben
  private async sortAnnotations() {
    this.annotations = this.unsortedAnnotations;
    this.unsortedAnnotations = this.annotations.slice(0);
    this.annotations.splice(0, this.annotations.length);
    this.annotations = this.unsortedAnnotations.slice(0);

    await this.annotations.sort((leftSide, rightSide): number => {
      if (+leftSide.ranking < +rightSide.ranking) {
        return -1;
      }
      if (+leftSide.ranking > +rightSide.ranking) {
        return 1;
      }
      return 0;
    });

    for (const annotation of this.annotations) {
      this.annotationmarkerService.createAnnotationMarker(annotation);
    }
  }

  public createNewAnnotation = function (result: any) {

    this.babylonService.createPreviewScreenshot(400).then(detailScreenshot => {

      const newAnnotation: Annotation = {
        _id: Math.random().toString(36).substr(2, 9),
        // relatedModel: BABYLON.Tags.GetTags(result.pickedMesh),
        relatedModel: this.modelName,
        ranking: String(this.annotations.length + 1),
        referencePoint: [{dimension: 'x', value: result.pickedPoint.x}, {dimension: 'y', value: result.pickedPoint.y}, {
          dimension: 'z', value: result.pickedPoint.z
        }],
        referencePointNormal: [{dimension: 'x', value: result.getNormal(true, true).x},
          {dimension: 'y', value: result.getNormal(true, true).y}, {
            dimension: 'z', value: result.getNormal(true, true).z
          }],
        cameraPosition: [{dimension: 'x', value: this.babylonService.getScene().activeCamera.alpha},
          {dimension: 'y', value: this.babylonService.getScene().activeCamera.beta},
          {dimension: 'z', value: this.babylonService.getScene().activeCamera.radius}],
        preview: detailScreenshot,
        originatorID: 'userID',
        validated: false,
        title: '',
        description: '',
        date: new Date().toISOString()
      };
      this.add(newAnnotation);
      this.annotationmarkerService.createAnnotationMarker(newAnnotation);
    });
  };

  private add(annotation): void {
    this.dataService.database.put(annotation);
    this.annotations.push(annotation);
    this.allAnnotations.push(annotation);
  }

  public exportAnnotations() {

    return new Promise<any>((resolve, reject) => {

      this.dataService.database.allDocs({include_docs: true, attachments: true}).then((result) => {
        resolve(JSON.stringify(result));
      });

    });
  }

  public deleteAllAnnotations() {

    for (const annotation of this.allAnnotations) {
      this.annotationmarkerService.deleteMarker(annotation._id);
    }

    this.annotations.length = 0;
    this.allAnnotations.length = 0;

    this.dataService.database.destroy().then(() => {
      this.dataService.database = new PouchDB('annotationdb');
    });
  }

  public importAnnotations() {

  }

  private async fetchData(): Promise<Array<any>> {

    return new Promise<any>((resolve, reject) => {

      const annotationList: Array<any> = [];

      this.dataService.fetch().then(result => {

        const rows = result.rows;

        for (const row of rows) {
          annotationList.push(row.doc);
        }
        resolve(annotationList);
      }, error => {
        reject(error);
      });
    });
  }

  public deleteAnnotation(annotation: Annotation) {

    this.annotationmarkerService.deleteMarker(annotation._id);
    this.dataService.delete(annotation._id, annotation._rev);
    const index: number = this.annotations.indexOf(annotation);

    if (index !== -1) {
      this.annotations.splice(index, 1);
    }

    const indexb: number = this.allAnnotations.indexOf(annotation);

    if (indexb !== -1) {
      this.allAnnotations.splice(indexb, 1);
    }

    this.changedRankingPositions();
  }

  public changedRankingPositions() {

    let i = 0;

    for (const annotation of this.annotations) {

      annotation.ranking = String(i + 1);
      this.annotationmarkerService.deleteMarker(annotation._id);
      this.annotationmarkerService.createAnnotationMarker(annotation);
      this.dataService.updateAnnotationRanking(annotation._id, annotation.ranking);

      i++;
    }

  }

  public createDefaultAnnotation(): Annotation {

    return {
      _id: '7wz2vuqt8',
      validated: true,
      title: 'Welcome to Kompakkt',
      relatedModel: 'Cube',
      referencePointNormal: [
        {dimension: 'x', value: -0.8949183602315889},
        {dimension: 'y', value: 0.011999712324764563},
        {dimension: 'z', value: -0.44606853220612525}
      ],
      referencePoint: [
        {dimension: 'x', value: -10.204414220764392},
        {dimension: 'y', value: 10.142734374740286},
        {dimension: 'z', value: -3.9197811803792177}
      ],
      ranking: '1',
      preview: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAADhCAYAAADmtuMcAAARU0lEQVR4Xu3de6xVZXoH4BcvXHQAPTJIlQxy08Y60yZYcNTUZESmGpUQgplJo41FJbaxamIijvWSpilNTKPRKS1/VGOdmGomBsJAGsdEg/iHo9UBagIKhJuCIhe5FhFp1poOOVwOZ5+1v3POXvt7VmJictb3ru993pXzc629wQHhIECAAAECFQQGVFhjCQECBAgQCAHiJiBAgACBSgICpBKbRQQIECAgQNwDBAgQIFBJQIBUYrOIAAECBASIe4AAAQIEKgkIkEpsFhEgQICAAHEPECBAgEAlAQFSic0iAgQIEBAg7gECBAgQqCQgQCqxWUSAAAECAsQ9QIAAAQKVBARIJTaLCBAgQECAuAcIECBAoJKAAKnEZhEBAgQICBD3AAECBAhUEhAgldgsIkCAAAEB4h4gQIAAgUoCAqQSm0UECBAgIEDcAwQIECBQSUCAVGKziAABAgQEiHuAAAECBCoJCJBKbBYRIECAgABxDxAgQIBAJQEBUonNIgIECBAQIO4BAgQIEKgkIEAqsVlEgAABAgLEPUCAAAEClQQGTJo06WillRYRIECAQNYCAiTr8WueAAEC1QUESHU7KwkQIJC1gADJevyaJ0CAQHUBAVLdzkoCBAhkLSBAsh6/5gkQIFBdQIBUt7OSAAECWQsIkKzHr3kCBAhUFxAg1e2sJECAQNYCAiTr8WueAAEC1QUESHU7KwkQIJC1gADJevyaJ0CAQHUBAVLdzkoCBAhkLSBAsh6/5gkQIFBdQIBUt7OSAAECWQsIkKzHr3kCBAhUFxAg1e2sJECAQNYCAiTr8WueAAEC1QUESHU7KwkQIJC1gADJevyaJ0CAQHUBAVLdzkoCBAhkLSBAsh6/5gkQIFBdQIBUt7OSAAECWQsIkKzHr3kCBAhUFxAg1e2sJECAQNYCAiTr8WueAAEC1QUESHU7KwkQIJC1gADJevyaJ0CAQHUBAVLdzkoCBAhkLSBAsh6/5gkQIFBdQIBUt7OyTQWmTZsW48ePj3Xr1sXrr7/epl1qi0DzAgKkeUMV2kxgwYIFxzqaM2dOm3WnHQLpBARIOkuV2kRAgLTJILXR6wICpNeJXaBuAgKkbhOz3/4SECD9Je+6LSsgQFp2NDbWYgICpMUGYjv9LyBA+n8GdlAPAQFSjznZZR8KCJA+xHapWgsIkFqPz+Z7Q0CA9Iaqmu0oIEDacap6akpAgDTFZ3FGAgIko2FrtTEBAdKYk7MICBD3AIETBASIW4JAYwICpDEnZ2UkIEAyGrZWmxIQIE3xWdyOAgKkHaeqp94QECC9oapmrQUESK3HZ/N9KCBA+hDbpeohIEDqMSe77H8BAdL/M7CDFhMQIC02ENtpWQEB0rKjsbH+EhAg/SXvunUTECB1m5j99rqAAOl1YhdoEwEB0iaD1EY6AQGSzlKl9hYQIO09X91VEBAgFdAsyVJAgGQ5dk2fTkCAuD8INCYgQBpzclZGAgIko2FrtSkBAdIUn8XtKCBA2nGqeuoNAQHSG6pq1lpAgNR6fDbfhwICpA+xXaoeAgKkHnOyy/4XECD9PwM7aDEBAdJiA7GdlhUQIC07GhvrLwEB0l/yrls3AQFSt4nZb68LCJBeJ3aBNhEQIG0ySG2kExAg6SxVam8BAdLe89VdBQEBUgHNkiwFBEiWY9f06QQEiPuDQGMCAqQxJ2dlJCBAMhq2VpsSECBN8VncrgKXXHJJbNiwoV3b0xeBJAICJAmjIgQIEMhPQIDkN3MdEyBAIImAAEnCqAgBAgTyExAg+c1cxwQIEEgiIECSMCpCgACB/AQESH4z13EXAmPGjIlZs2bFqFGjYuDAgbF37974+OOPY9WqVfHBBx9wI0DgBAEB4pbISmDs2LFx9dVXxxVXXBEdHR1N9X706NHYtWtX+c+mTZvinXfeic2bNzdV02ICdRIQIHWalr02JDBs2LCYOnVq7N+/P957773YuXNnua7zHxDsrtDabQdjwqgh3Z3W0M+LfSxcuDCWLVvW0PlOIlAXAQFSl0nZZ8MC8+bNa/jpYv0XB+Off7U53l+/N458e7Tba4wcNjDGjhwcfzLmO3H998+PcSMbC5mlS5fGokWLuq3vBAJ1EhAgdZqWvTYk0JMAOVXBvQePxJqtB2LVpn2xfM1XsWLjvjh30Jkx7QcdMXPKd+MPLzqnoX10Pumll16K5cuX93idBQRaWUCAtPJ07K2SQOcAeeGtrbFx+//GpHFDY/KEYXHh8IGVavZk0fxffxpvrNwVc6d/r7xmcQiQngg6ty4CAqQuk7LPhgUee+yxGD16dHn+v/760/j3N7d2ubYIlivHDY0f/6AjvjdicMPXKE78dOehWPLhjvjVBzvis12HTlo7/68uPRYgTz/9dKxevbpH9Z1MoNUFBEirT8j+eizw0EMPxcSJExsKkNMVH90xKH546fCYNHZoTPyDIfHGql3xy3e/iO17Dje0p//82z869kG8AGmIzEk1ExAgNRuY7XYvkCpAur/S6c/oHCCPPvpofPnll82WtJ5ASwkIkJYah82kEOgcIP+1Ymf83SvrU5TtcY3Xf/bH0fGds8t1AqTHfBbUQECA1GBIttgzAQHSMy9nE6gqIECqylnXsgKtGCBz5sxpWS8bI1BVQIBUlbOuZQXuvPPOuOqqq8r99ecrrPf/8cpjRgKkZW8XG2tCQIA0gWdpawoIkNaci121n4AAab+ZZt9RygCZMvG8+OXca2LAgAGx5DdbYs6//bZhX08gDVM5saYCAqSmg7PtrgVSBsijM8bEjD/97rGLXfmz9xumFyANUzmxpgICpKaDs+3GAuQ3a/fEXz//cWWuzgGy+8A3MfUfPIFUxrSw7QQESNuNVEPTp0+Pm266qYQQIO4HAr0nIEB6z1blfhJIGSDzZ18ak8f/7i9E9ATSTwN12ZYVECAtOxobqyogQKrKWUegZwICpGdezq6BgACpwZBssS0EBEhbjFETnQUEiPuBQN8ICJC+cXaVPhS4/vrr47bbbiuv2OyH6J0/Ayn+x1Qzn/6fhjvxNd6GqZxYUwEBUtPB2XbXAtdcc03ccccd5Qlrtx2Mnzz7UWUuAVKZzsIMBARIBkPOrUUBktvE9dtfAgKkv+Rdt9cEBEiv0SpM4DgBAeKGaDuB3wfIWWedFSNGjY5H/mNlvPRGtT+Nvuih78fFHYNKo0Y+A/mLH02MXzz8o/L8TZs2xfbt28t/P9Xfxjt8+PD46quv2s5fQ/kICJB8Zp1Np52fQIqmhwwZEhdddFGcd955pcHf/+K/418WfxRf7D7YrUnnAPlk28H46Sk+T7ntz8bHK49OLWvt2rUr1q8/+f+AeGKAPPDAA9HR0RGXXXZZnH/++bFx48ZYtmxZLF68OHbv3t3tvpxAoBUEBEgrTMEeeiQwevTouOuuu+Lmm2+OQ4cOxWeffRYvvPBCLF26tKxT/Pzhhx+OgQMHdln34osvjhEjRkTxlLJmy+74m58vj2Urt8bhI98et6ZzgKzYuC9mL1hd/nz6Dy+JhU/+uPz3PXv2xCeffHLStdauXRtPPfXUKfdQBMipjnPPPTcmTJgQw4YNK/f26quvlsGyefPmHhk5mUBfCAiQvlB2jaYEzjjjjJgyZUo899xzZZ19+/bFmjVrjv9Fv2jRsQA58WJTp06NadOmRfHKqKtj8ODBMXbs2PJppfir2+cv/ij+6ZXfxs//cuyxV1jrtx+KWX9+dVli//79sXr178Kk87Fz58548skny2A73VGE23XXXRcTJ048bdAVNYq9jRs3rtx/YVEEysKFC4VKU3eVxSkEBEgKRTWSC4waNSrmzp0b1157bRw+fDi2bNkSxS/nUx2ff/55PP744w3vofhlPHv27PIJ5HTHmDFjYuvWrfH111+Xp51zzjlx4MCBk5bs3bs3HnnkkXKfzR433HBDQ6FSXGf8+PHla7kzzzwz1q1bFwsWLCg/c+kuvJrdo/UEfi8gQNwLLSEwaNCgmDVrVhSvdo4ePRrFL+VTvRYqNvvNN9/EkiVLunziqNJQ8dRQhFbx9NHIUezx5ZdfLp8GevMoPh+58cYb44ILLiiDorujeIoaOnRo+fprw4YNpdOHH354LAS7W+/nBHoiIEB6ouXcpALFL7o333yzrHnkyJEyMIpXQ6c6iqeA++67L+n1T1fs9ttvL1+bnX322ced9u6778bzzz/fZ/s41YWKz0luueWWGDlyZPlKq7ujeNIqwrEIoCL4XnzxxXj77bfj22+P/7ynuzp+TuBEAQHinugzgeK/7u+55564++67y2sWr56KV1NdHdu2bYsnnniiz/ZX5wsVQTdjxozy22aNHEUIFh/+Owg0IyBAmtGztluByZMnx7PPPlu+UimOFStWlK+gujrmz58fK1euLP9L2VFdoAjr4ttot95660lPUUXVZ555pnpxKwn8v4AAcSskFyg+oL733nvLusWH0MWTxOlelzz44IOn/HA6+cYyL1i8wrrwwgvLMC/+kKODQLMCAqRZQetPEii+Mjtz5swuZd5666147bXXfFvIvUOg5gICpOYDbMXtX3755XH//fcft7V58+aV3wpyECDQPgICpH1m2VKdFN8OKr6CumPHjpbal80QIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQESDpLlQgQIJCVgADJatyaJUCAQDoBAZLOUiUCBAhkJSBAshq3ZgkQIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQESDpLlQgQIJCVgADJatyaJUCAQDoBAZLOUiUCBAhkJSBAshq3ZgkQIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQESDpLlQgQIJCVgADJatyaJUCAQDoBAZLOUiUCBAhkJSBAshq3ZgkQIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQESDpLlQgQIJCVgADJatyaJUCAQDoBAZLOUiUCBAhkJSBAshq3ZgkQIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQESDpLlQgQIJCVgADJatyaJUCAQDoBAZLOUiUCBAhkJSBAshq3ZgkQIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQESDpLlQgQIJCVgADJatyaJUCAQDoBAZLOUiUCBAhkJSBAshq3ZgkQIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQESDpLlQgQIJCVgADJatyaJUCAQDoBAZLOUiUCBAhkJSBAshq3ZgkQIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQGpCulEgECBAjkJCBAcpq2XgkQIJBQQIAkxFSKAAECOQkIkJymrVcCBAgkFBAgCTGVIkCAQE4CAiSnaeuVAAECCQUESEJMpQgQIJCTgADJadp6JUCAQEIBAZIQUykCBAjkJCBAcpq2XgkQIJBQQIAkxFSKAAECOQkIkJymrVcCBAgkFBAgCTGVIkCAQE4CAiSnaeuVAAECCQUESEJMpQgQIJCTgADJadp6JUCAQEIBAZIQUykCBAjkJCBAcpq2XgkQIJBQQIAkxFSKAAECOQkIkJymrVcCBAgkFBAgCTGVIkCAQE4CAiSnaeuVAAECCQUESEJMpQgQIJCTgADJadp6JUCAQEIBAZIQUykCBAjkJCBAcpq2XgkQIJBQQIAkxFSKAAECOQkIkJymrVcCBAgkFBAgCTGVIkCAQE4C/weLi1NGQXXHbQAAAABJRU5ErkJggg==',
      originatorID: 'userID',
      description: 'Hi! I am an annotation of this cool logo. Please feel free to add a friend for me by clicking on the edit button in the corner on the right bottom and double click this 3D logo!',
      date: '2019-01-18T22:05:31.230Z',
      cameraPosition: [
        {dimension: 'x', value: 2.7065021761026817},
        {dimension: 'y', value: 1.3419080619941322},
        {dimension: 'z', value: 90.44884111420268}]
    };

  }

}
