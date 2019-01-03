import {Injectable} from '@angular/core';
import {Annotation} from 'src/app/interfaces/annotation/annotation';
import {DataService} from '../data/data.service';
import {BabylonService} from '../babylon/babylon.service';
import * as BABYLON from 'babylonjs';
import {ActionService} from '../action/action.service';
import {AnnotationmarkerService} from '../annotationmarker/annotationmarker.service';

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

  constructor(private babylonService: BabylonService,
              private dataService: DataService,
              private actionService: ActionService,
              private annotationmarkerService: AnnotationmarkerService) {
    this.initialLoading = true;
    this.annotations = [];
  }

  public async loadAnnotations(modelName: string) {

    // Der mdelName wird beim Laden eines neuen Modells übergeben und hier gespeichert,
    // um auch als Referenz für eine neu erstellte Annotation nutzbar zu sein
    this.modelName = modelName;

    // In diesem Array sollten alle Annotationen in der richtigen Reihenfolge liegen, die visuell für das aktuelle
    // Model relevant sind, zu Beginn also erstmal keine
    this.annotations = [];

    // Hier werden die Annotationen unsortiert rein geworfen, wenn sie aus der Datenbank kommen
    this.unsortedAnnotations = [];

    // Alle Marker, die eventuell vom vorherigen Modell noch da sind, sollen gelöscht werden
    this.annotationmarkerService.deleteAllMarker();


    // 1)
    setTimeout(() => {

      // Beim ersten Laden eines Mdoells, werden alle in der PuchDB vorhandenen Annotationen in
      // das Array "allAnnotations" geladen
      if (this.initialLoading) {
        this.allAnnotations = [];
        this.allAnnotations = this.fetchData();
        this.initialLoading = false;
      }
      // Ende 1
    }, 600);


    // Das darf erst nach 1) passieren
    // 2)
    setTimeout(() => {

      // Die Annotationen, die sich auf das aktuelle Model beziehen (also als relatedModel den Namen
      // des aktuellen Models aufweisen, werden raus gesucht und in das Array für unsortierte Annotationen
      // gepusht, da sie dort liegen ohne visuelle Elemente zu erzeugen
      for (const annotation of this.allAnnotations) {
        if (annotation.relatedModel === modelName) {
          this.unsortedAnnotations.push(annotation);
        }
      }
    }, 800);

    // Das darf erst nach 2) passieren
    // 3)
    setTimeout(() => {

      // Jetzt sollen die Annotationen sortiert werden und in der richtigen Reihenfolge in das Array geschrieben werden
      // Achtung: dann gibt es auch direkt einen visuellen Output durch die Components!
      // Da die Labels erst im nächsten Schritt gezeichnet werden, hängen die Fenster der Annotationen dann kurz ohne Position
      // in der oberen linken Ecke.

      this.sortAnnotations();

    }, 1000);

    // Das darf erst nach 3) passieren
    // 4)
    setTimeout(() => {

      // Die Labels werden gezeichnet und die Fenster haben nun einen Orientierungspunkt
      for (const annotation of this.annotations) {
        this.annotationmarkerService.createAnnotationMarker(annotation);
      }
    }, 1200);

    setTimeout(() => {
      // Das neu geladene Modell wird annotierbar, ist aber noch nicht klickbar -> das soll erst passieren,
      // wenn der Edit-Mode aufgerufen wird
      this.initializeAnnotationMode(modelName);
      this.actionService.pickableModel(modelName, false);
    }, 1400);

  }

  // Das aktuelle Modell wird anklickbar und damit annotierbar
  public annotationMode(value: boolean) {
    this.actionService.pickableModel(this.modelName, value);
  }

  // Die Annotationsfunktionalität wird zum aktuellen Modell hinzugefügt
  public initializeAnnotationMode(modelName: string) {
    this.actionService.createActionManager(modelName, BABYLON.ActionManager.OnDoublePickTrigger, this.createNewAnnotation.bind(this));
  }

  // Die Annotationen werden in der richtigen Reihenfolge in das Array für den visuellen Output geschrieben
  private sortAnnotations() {
    this.annotations = this.unsortedAnnotations;
    this.unsortedAnnotations = this.annotations.slice(0);
    this.annotations.splice(0, this.annotations.length);
    this.annotations = this.unsortedAnnotations.slice(0);

    this.annotations.sort((leftSide, rightSide): number => {
      if (+leftSide.ranking < +rightSide.ranking) {
        return -1;
      }
      if (+leftSide.ranking > +rightSide.ranking) {
        return 1;
      }
      return 0;
    });
  }

  public createNewAnnotation = function (result: any) {

    this.babylonService.createPreviewScreenshot(220).then(detailScreenshot => {

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

  private fetchData(): Array<any> {

    const annotationList: Array<any> = [];

    this.dataService.fetch().then(result => {

      const rows = result.rows;

      for (const row of rows) {
        annotationList.push(row.doc);
      }
    }, error => {
      console.error(error);
    });

    return annotationList;
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

}
