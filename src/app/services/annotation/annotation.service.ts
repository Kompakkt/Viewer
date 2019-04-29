import {EventEmitter, Injectable, Output} from '@angular/core';
import {MatDialog, MatDialogConfig} from '@angular/material';
import {ActionManager} from 'babylonjs';
import * as BABYLON from 'babylonjs';
import {Socket} from 'ngx-socket-io';
import {BehaviorSubject} from 'rxjs/internal/BehaviorSubject';

import {environment} from '../../../environments/environment';
import {DialogGetUserDataComponent} from '../../components/dialogs/dialog-get-user-data/dialog-get-user-data.component';
import {DialogShareAnnotationComponent} from '../../components/dialogs/dialog-share-annotation/dialog-share-annotation.component';
import {IAnnotation, ICompilation, IModel} from '../../interfaces/interfaces';
import {ActionService} from '../action/action.service';
import {AnnotationmarkerService} from '../annotationmarker/annotationmarker.service';
import {BabylonService} from '../babylon/babylon.service';
import {CameraService} from '../camera/camera.service';
import {CatalogueService} from '../catalogue/catalogue.service';
import {DataService} from '../data/data.service';
import {LoadModelService} from '../load-model/load-model.service';
import {MessageService} from '../message/message.service';
import {MongohandlerService} from '../mongohandler/mongohandler.service';
import {UserdataService} from '../userdata/userdata.service';
import {SocketService} from '../socket/socket.service';
import {OverlayService} from '../overlay/overlay.service';

@Injectable({
  providedIn: 'root',
})

export class AnnotationService {

  public isAnnotatingAllowed = false;
  @Output() annnotatingAllowed: EventEmitter<boolean> = new EventEmitter();
  public isCollectionInputSelected: boolean;
  // TODO
  private isOpen = false;
  private isMeshSettingsMode: boolean;
  public inSocket: false;

  public annotations: IAnnotation[];
  public defaultAnnotationsSorted: IAnnotation[];
  public collectionAnnotationsSorted: IAnnotation[];

  private defaultAnnotations: IAnnotation[];
  private collectionAnnotations: IAnnotation[];
  private unsortedAnnotations: IAnnotation[];
  private pouchDBAnnotations: IAnnotation[];
  private serverAnnotations: IAnnotation[];
  private currentModel: IModel;
  public currentCompilation: ICompilation;
  private actualModelMeshes: BABYLON.Mesh[] = [];

  private isDefaultLoad: boolean;
  private isModelOwner: boolean;
  private isCollection: boolean;

  private isannotationSourceCollection: boolean;
  @Output() annotationSourceCollection: EventEmitter<boolean> = new EventEmitter();

  private selectedAnnotation: BehaviorSubject<string> = new BehaviorSubject('');
  public isSelectedAnnotation = this.selectedAnnotation.asObservable();

  private editModeAnnotation: BehaviorSubject<string> = new BehaviorSubject('');
  public isEditModeAnnotation = this.editModeAnnotation.asObservable();

  constructor(private babylonService: BabylonService,
              private dataService: DataService,
              private actionService: ActionService,
              private annotationmarkerService: AnnotationmarkerService,
              private loadModelService: LoadModelService,
              private mongo: MongohandlerService,
              private message: MessageService,
              public socket: Socket,
              private catalogueService: CatalogueService,
              private cameraService: CameraService,
              private dialog: MatDialog,
              private userdataService: UserdataService,
              private socketService: SocketService,
              private overlayService: OverlayService) {

    this.annotations = [];

    this.socketService.socketAnnotationSource.subscribe(socketSource => {
      if (socketSource) {
        this.annotations = [];
        this.annotations = this.socketService.annotationsForSocket;
        this.redrawMarker();
      } else {
        this.annotations = JSON.parse(JSON.stringify(this.isannotationSourceCollection ?
          this.collectionAnnotationsSorted : this.defaultAnnotationsSorted));
        this.redrawMarker();
      }
    });

    this.socketService.inSocket.subscribe(inSocket => {
      this.inSocket = inSocket;
    });

    this.overlayService.editorSetting.subscribe(meshSettingsMode => {
      this.isMeshSettingsMode = meshSettingsMode;
      this.setAnnotatingAllowance();
    });

    this.overlayService.editor.subscribe(open => {
      this.isOpen = open;
      this.setAnnotatingAllowance();
    });

    this.loadModelService.Observables.actualModel.subscribe(actualModel => {
      this.currentModel = actualModel;
    });

    this.loadModelService.Observables.actualCollection.subscribe(actualCompilation => {
      if (!actualCompilation) return;
      actualCompilation._id ? this.isCollection = true : this.isCollection = false;
      this.currentCompilation = actualCompilation;
    });

    this.loadModelService.Observables.actualModelMeshes.subscribe(actualModelMeshes => {
      this.actualModelMeshes = actualModelMeshes;
      this.loadAnnotations();
    });

    this.loadModelService.defaultModelLoaded.subscribe(defaultLoad => {
      this.isDefaultLoad = defaultLoad;
    });

    this.annotationmarkerService.isSelectedAnnotation.subscribe(selectedAnno => {
      this.selectedAnnotation.next(selectedAnno);
    });

  }

  public async loadAnnotations() {

    BABYLON.Tags.AddTagsTo(this.actualModelMeshes, this.currentModel._id);

    // In diesem Array sollten alle Annotationen in der richtigen Reihenfolge liegen,
    // die visuell für das aktuelle
    // Model relevant sind, zu Beginn also erstmal keine
    this.annotations = [];

    // Hier werden die Annotationen unsortiert rein geworfen,
    // wenn sie aus den verschiedenen Quellen geladen und aktualisiert wurden
    // Dieses Array erzeugt keine visuellen Elemente
    this.unsortedAnnotations = [];

    // Annnotationen aus PouchDB
    this.pouchDBAnnotations = [];

    // Annotationen, die auf dem Server gespeichert sind
    this.serverAnnotations = [];

    // Annotationen, die nicht zu einer Collection gehören
    this.defaultAnnotations = [];
    this.defaultAnnotationsSorted = [];

    // Annotationen, die zu einer Collection gehören
    this.collectionAnnotations = [];
    this.collectionAnnotationsSorted = [];

    this.selectedAnnotation.next('');
    this.editModeAnnotation.next('');

    // Alle Marker, die eventuell vom vorherigen Modell noch da sind, sollen gelöscht werden
    await this.annotationmarkerService.deleteAllMarker();
    // Beim Laden eines Modells, werden alle in der PuchDB vorhandenen Annotationen,
    // auf dem Server vorhandenen Anntoatationen geladen
    if (!this.isDefaultLoad) {
      await this.getAnnotationsfromServerDB();
      await this.getAnnotationsfromLocalDB();
      await this.updateLocalDB();
      await this.updateAnnotationList();
      await this.splitDefaultCollection();
      await this.sortAnnotationsDefault();
      await this.sortAnnotationsCollection();
    } else {
      this.defaultAnnotations = [];
      this.defaultAnnotationsSorted.push(this.createDefaultAnnotation());
      this.socketService.initialAnnotationsForSocket(this.defaultAnnotationsSorted);
    }
    // Jetzt sollen die Annotationen sortiert werden und in der richtigen Reihenfolge in das Array geschrieben werden
    // Achtung: dann gibt es auch direkt einen visuellen Output durch die Components!
    // Da die Labels erst im nächsten Schritt gezeichnet werden, hängen die Fenster der Annotationen dann kurz ohne Position
    // in der oberen linken Ecke.
    // Die Labels werden gezeichnet und die Fenster haben nun einen Orientierungspunkt

    // Das neu geladene Modell wird annotierbar, ist aber noch nicht klickbar -> das soll erst passieren,
    // wenn der Edit-Mode aufgerufen wird
    this.initializeAnnotationMode();
    this.toggleAnnotationSource(false, true);
  }

  private async getAnnotationsfromServerDB() {
    // Annotationen vom Server des aktuellen Modells...
    if (this.currentModel.annotationList) {
      this.currentModel.annotationList.forEach(annotation => {
        if (annotation && annotation._id) {
          this.serverAnnotations.push(annotation);
        }
      });
    }
    // ...und der aktuellen Compilation (if existing)
    if (this.isCollection && this.currentCompilation.annotationList) {
      this.currentCompilation.annotationList.forEach(annotation => {
        if (annotation && annotation._id) {
          this.serverAnnotations.push(annotation);
        }
      });
    }
    console.log('getAnnotationsfromServerDB', this.serverAnnotations);
  }

  private async getAnnotationsfromLocalDB() {
    // Annotationen aus PouchDB des aktuellen Modells und der aktuellen Compilation (if existing)
    this.pouchDBAnnotations = await this.fetchAnnotations(this.currentModel._id);

    if (this.isCollection) {
      const _compilationAnnotations = await this.fetchAnnotations(this.currentModel._id
        && this.currentCompilation._id);
      this.pouchDBAnnotations = this.pouchDBAnnotations.concat(_compilationAnnotations);
    }
    console.log('getAnnotationsfromLocalDB', this.pouchDBAnnotations);
  }

  private async updateLocalDB() {
    this.serverAnnotations.forEach(annotation => {
      const localAnnotation = this.pouchDBAnnotations
        .find(_localAnnotation => _localAnnotation._id === annotation._id);
      if (!localAnnotation) {
        this.dataService.updateAnnotation(annotation);
        this.pouchDBAnnotations.push(annotation);
      }
    });
    console.log('updateLocalDB', this.pouchDBAnnotations);
  }

  private async updateAnnotationList() {
    // Durch alle Annotationen der lokalen DB
    this.pouchDBAnnotations.forEach(annotation => {
      const isLastModifiedByMe = annotation.lastModifiedBy._id
        === this.userdataService.currentUserData._id;
      const isCreatedByMe = annotation.creator._id
        === this.userdataService.currentUserData._id;

      // Finde die Annotaion in den Server Annotationen
      if (annotation && this.serverAnnotations) {
        const serverAnnotation = this.serverAnnotations
          .find(_serverAnnotation => _serverAnnotation._id === annotation._id);
        // Wenn sie gefunden wurde aktuellere speichern lokal bzw. server

        if (serverAnnotation) {
          if (annotation.lastModificationDate && serverAnnotation.lastModificationDate) {
            // vergleichen welche aktueller ist
            if (annotation.lastModificationDate !== serverAnnotation.lastModificationDate) {

              if (annotation.lastModificationDate < serverAnnotation.lastModificationDate) {
                // Update local DB
                this.dataService.updateAnnotation(serverAnnotation);
                this.pouchDBAnnotations
                  .splice(this.pouchDBAnnotations.indexOf(annotation), 1, serverAnnotation);
                this.unsortedAnnotations.push(serverAnnotation);
              }

              if (serverAnnotation.lastModificationDate < annotation.lastModificationDate) {
                // Update Server
                this.mongo.updateAnnotation(annotation);
                this.serverAnnotations.splice(this.pouchDBAnnotations
                  .indexOf(serverAnnotation), 1, annotation);
                this.unsortedAnnotations.push(annotation);
              }
            } else {
              // Server und LocalDB identisch
              this.unsortedAnnotations.push(annotation);
            }

            // Wenn sie nicht gefunden wurde: Annotation existiert nicht auf dem Server,
            // aber in der Local DB
            // -> wurde gelöscht oder
            // noch nicht gespeichert
          }
        } else {
          // Nicht in Server Annos gefunden
          // Checke, ob local last editor === creator === ich
          if (isLastModifiedByMe && isCreatedByMe) {
            // Annotation auf Server speichern
            // Update Server
            this.mongo.updateAnnotation(annotation);
            this.serverAnnotations.push(annotation);
            this.unsortedAnnotations.push(annotation);
          } else {
            // Nicht local last editor === creator === ich
            // Annotation local löschen
            this.dataService.deleteAnnotation(annotation._id);
            this.pouchDBAnnotations.splice(this.pouchDBAnnotations.indexOf(annotation));
          }

        }
      } else {
        // Nicht in Server Annos gefunden
        // Checke, ob local last editor === creator === ich
        if (isLastModifiedByMe && isCreatedByMe) {
          // Annotation auf Server speichern
          // Update Server
          this.mongo.updateAnnotation(annotation);
          this.serverAnnotations.push(annotation);
          this.unsortedAnnotations.push(annotation);
        } else {
          // Nicht local last editor === creator === ich
          // Annotation local löschen
          this.dataService.deleteAnnotation(annotation._id);
          this.pouchDBAnnotations.splice(this.pouchDBAnnotations.indexOf(annotation));
        }
      }
    });

    console.log('UpdatedAnnotations', this.unsortedAnnotations);
  }

  private async splitDefaultCollection() {
    this.unsortedAnnotations.forEach(annotation => {
      if (annotation._id) {
        if (!annotation.target.source.relatedCompilation ||
          annotation.target.source.relatedCompilation === '') {
          this.defaultAnnotations.push(annotation);
        } else {
          if (this.currentCompilation._id) {
            this.collectionAnnotations.push(annotation);
          }
        }
      }
    });
    console.log('splitDefaultCollection', this.defaultAnnotations, this.collectionAnnotations);
  }

  private async sortAnnotationsDefault() {

    this.defaultAnnotationsSorted = this.defaultAnnotations;
    this.defaultAnnotations = this.defaultAnnotationsSorted.slice(0);
    this.defaultAnnotationsSorted.splice(0, this.defaultAnnotationsSorted.length);
    this.defaultAnnotationsSorted = this.defaultAnnotations.slice(0);

    await this.defaultAnnotationsSorted.sort((leftSide, rightSide): number => {
      if (+leftSide.ranking < +rightSide.ranking) {
        return -1;
      }
      if (+leftSide.ranking > +rightSide.ranking) {
        return 1;
      }
      return 0;
    });

    this.changedRankingPositions(this.defaultAnnotationsSorted);
  }

  private async sortAnnotationsCollection() {

    this.collectionAnnotationsSorted = this.collectionAnnotations;
    this.collectionAnnotations = this.collectionAnnotationsSorted.slice(0);
    this.collectionAnnotationsSorted.splice(0, this.collectionAnnotationsSorted.length);
    this.collectionAnnotationsSorted = this.collectionAnnotations.slice(0);

    await this.collectionAnnotationsSorted.sort((leftSide, rightSide): number => {
      if (+leftSide.ranking < +rightSide.ranking) {
        return -1;
      }
      if (+leftSide.ranking > +rightSide.ranking) {
        return 1;
      }
      return 0;
    });
    // TODO move to load function
    this.socketService.initialAnnotationsForSocket(this.collectionAnnotationsSorted);

    this.changedRankingPositions(this.collectionAnnotationsSorted);
  }

  // Die Annotationsfunktionalität wird zum aktuellen Modell hinzugefügt
  public initializeAnnotationMode() {
    this.actualModelMeshes.forEach(mesh => {
      this.actionService.createActionManager(mesh, ActionManager.OnDoublePickTrigger, this.createNewAnnotation.bind(this));
    });
    this.annotationMode(false);
  }

  public async createNewAnnotation(result: any) {

    const camera = this.cameraService.getActualCameraPosAnnotation();

    this.babylonService.createPreviewScreenshot(400)
      .then(async detailScreenshot => {
        // TODO: Detect if user is offline
        let generatedId = this.mongo.generateObjectId();
        /* TODO check id from server is needed
        await this.mongo.getUnusedObjectId()
          .then(id => generatedId = id)
          .catch(e => console.error(e));*/

        const personName = this.userdataService.currentUserData.fullname;
        const personID = this.userdataService.currentUserData._id;

        const newAnnotation: IAnnotation = {
          validated: (!this.isCollection),
          _id: generatedId,
          identifier: generatedId,
          ranking: this.annotations.length + 1,
          creator: {
            type: 'person',
            name: personName,
            _id: personID,
          },
          created: new Date().toISOString(),
          generator: {
            type: 'software',
            name: environment.version,
            _id: personID,
            homepage: 'https://github.com/DH-Cologne/Kompakkt',
          },
          motivation: 'defaultMotivation',
          lastModifiedBy: {
            type: 'person',
            name: personName,
            _id: personID,
          },
          body: {
            type: 'annotation',
            content: {
              type: 'text',
              title: '',
              description: '',
              relatedPerspective: {
                cameraType: camera.cameraType,
                position: {
                  x: camera.position.x,
                  y: camera.position.y,
                  z: camera.position.z,
                },
                target: {
                  x: camera.target.x,
                  y: camera.target.y,
                  z: camera.target.z,
                },
                preview: detailScreenshot,
              },
            },
          },
          target: {
            source: {
              relatedModel: this.currentModel._id,
              relatedCompilation: this.isCollection ? this.currentCompilation._id : '',
            },
            selector: {
              referencePoint: {
                x: result.pickedPoint.x,
                y: result.pickedPoint.y,
                z: result.pickedPoint.z,
              },
              referenceNormal: {
                x: result.getNormal(true, true).x,
                y: result.getNormal(true, true).y,
                z: result.getNormal(true, true).z,
              },
            },
          },
        };

        console.log(newAnnotation);
        this.add(newAnnotation);
      });
  }

  private add(annotation: IAnnotation): void {

    if (this.isDefaultLoad) {
      this.annotations.push(annotation);
      this.defaultAnnotationsSorted.push(annotation);
      this.drawMarker(annotation);
      // set created annotation as is_open in
      // annotationmarker.service ((on double click) created annotation)
      this.selectedAnnotation.next(annotation._id);
      this.editModeAnnotation.next(annotation._id);
      const annoSocket = this.socketService.annotationforSocket(annotation, 'add');
      if (this.inSocket) {
        this.socket.emit('createAnnotation', {annoSocket});
      }
      return;
    }

    this.mongo.updateAnnotation(annotation)
      .toPromise()
      .then((resultAnnotation: IAnnotation) => {
        console.log('Die result Anno:', resultAnnotation);
        // MongoDB hat funktioniert
        // MongoDB-Eintrag in PouchDB
        this.dataService.updateAnnotation(resultAnnotation);

        (!resultAnnotation.target.source.relatedCompilation ||
          resultAnnotation.target.source.relatedCompilation === '') ?
          this.defaultAnnotationsSorted.push(resultAnnotation) :
          this.collectionAnnotationsSorted.push(resultAnnotation);
        this.drawMarker(resultAnnotation);
        this.annotations.push(resultAnnotation);
        // set created annotation as is_open in
        // annotationmarker.service ((on double click) created annotation)
        this.selectedAnnotation.next(resultAnnotation._id);
        this.editModeAnnotation.next(resultAnnotation._id);
        if (this.isannotationSourceCollection) {
          const annoSocket = this.socketService.annotationforSocket(resultAnnotation, 'add');
          if (this.inSocket) {
            this.socket.emit('createAnnotation', {annoSocket});
          }
        }
      })
      .catch((errorMessage: any) => {
        // PouchDB
        // TODO: Später synchronisieren
        annotation.lastModificationDate = new Date().toISOString();
        console.log(errorMessage);
        this.dataService.updateAnnotation(annotation);
        (!annotation.target.source.relatedCompilation ||
          annotation.target.source.relatedCompilation === '') ?
          this.defaultAnnotationsSorted.push(annotation) :
          this.collectionAnnotationsSorted.push(annotation);
        this.drawMarker(annotation);
        this.annotations.push(annotation);
        // set created annotation as is_open in
        // annotationmarker.service ((on double click) created annotation)
        this.selectedAnnotation.next(annotation._id);
        this.editModeAnnotation.next(annotation._id);
        if (this.isannotationSourceCollection) {
          const annoSocket = this.socketService.annotationforSocket(annotation, 'add');
          if (this.inSocket) {
            this.socket.emit('createAnnotation', {annoSocket});
          }
        }
      });
  }

  public updateAnnotation(annotation: IAnnotation) {
    if (this.isDefaultLoad) {
      this.annotations.splice(this.annotations.indexOf(annotation), 1, annotation);
      this.defaultAnnotationsSorted.splice(this.annotations.indexOf(annotation), 1, annotation);

      const annoSocket = this.socketService.annotationforSocket(annotation, 'edit');
      if (this.inSocket) {
        this.socket.emit('editAnnotation', {annoSocket});
      }
      return;
    }

    this.mongo.updateAnnotation(annotation)
      .toPromise()
      .then((resultAnnotation: IAnnotation) => {
        // MongoDB hat funktioniert
        // MongoDB-Eintrag in PouchDB
        this.dataService.updateAnnotation(resultAnnotation);
        this.annotations
          .splice(this.annotations.indexOf(resultAnnotation), 1, resultAnnotation);
        (!resultAnnotation.target.source.relatedCompilation ||
          resultAnnotation.target.source.relatedCompilation === '') ?
          this.defaultAnnotationsSorted
            .splice(this.annotations.indexOf(resultAnnotation), 1, resultAnnotation) :
          this.collectionAnnotationsSorted
            .splice(this.annotations.indexOf(resultAnnotation), 1, resultAnnotation);
        if (this.isannotationSourceCollection) {
          const annoSocket = this.socketService.annotationforSocket(resultAnnotation, 'edit');
          if (this.inSocket) {
            this.socket.emit('editAnnotation', {annoSocket});
          }
        }
      })
      .catch((errorMessage: any) => {
        // PouchDB
        // TODO: Später synchronisieren
        console.log(errorMessage);
        annotation.lastModificationDate = new Date().toISOString();
        this.dataService.updateAnnotation(annotation);
        this.annotations
          .splice(this.annotations.indexOf(annotation), 1, annotation);
        (!annotation.target.source.relatedCompilation ||
          annotation.target.source.relatedCompilation === '') ?
          this.defaultAnnotationsSorted
            .splice(this.annotations.indexOf(annotation), 1, annotation) :
          this.collectionAnnotationsSorted
            .splice(this.annotations.indexOf(annotation), 1, annotation);
        if (this.isannotationSourceCollection) {
          const annoSocket = this.socketService.annotationforSocket(annotation, 'edit');
          if (this.inSocket) {
            this.socket.emit('editAnnotation', {annoSocket});
          }
        }
      });
  }

  public deleteAnnotation(annotation: IAnnotation) {

    if (this.userdataService.isAnnotationOwner(annotation)) {

      if (this.isDefaultLoad) {
        const index: number = this.annotations.indexOf(annotation);
        if (index !== -1) {
          this.annotations.splice(index, 1);
          this.defaultAnnotationsSorted.splice(this.annotations.indexOf(annotation), 1);
          const annoSocket = this.socketService.annotationforSocket(annotation, 'edit');
          if (this.inSocket) {
            this.socket.emit('editAnnotation', {annoSocket});
          }
          this.changedRankingPositions(this.annotations);
          this.redrawMarker();
        }
        return;
      }

      if (this.isannotationSourceCollection) {
        const annoSocket = this.socketService.annotationforSocket(annotation, 'delete');
        if (this.inSocket) {
          this.socket.emit('editAnnotation', {annoSocket});
        }
      }

      this.dataService.deleteAnnotation(annotation._id);
      this.annotations
        .splice(this.annotations.indexOf(annotation), 1);
      this.changedRankingPositions(this.annotations);
      this.redrawMarker();

      (!annotation.target.source.relatedCompilation ||
        annotation.target.source.relatedCompilation === '') ?
        this.defaultAnnotationsSorted
          .splice(this.annotations.indexOf(annotation), 1) :
        this.collectionAnnotationsSorted
          .splice(this.annotations.indexOf(annotation), 1);

      // User pwd check for deliting on Server
      const username = this.userdataService.cachedLoginData.username;
      const password = this.userdataService.cachedLoginData.password;

      if (username === '' || password === '') {
        this.passwordDialog(annotation._id);
      } else {

        this.mongo.deleteRequest(annotation._id, 'annotation', username, password)
          .toPromise()
          .then((result: any) => {
            if (result.status === 'ok') {
              this.message.info('Deleted from Server');
            } else {
              this.message.info('Not deleted from Server');
              this.passwordDialog(annotation._id);
            }
          })
          .catch((errorMessage: any) => {
            console.log(errorMessage);
            this.message.error('Can not see if you are logged in.');
          });
      }
    } else {
      this.message.error('You are not the Owner of this Annotation.');
    }
  }

  public passwordDialog(annotationId: string) {
    const dialogConfig = new MatDialogConfig();

    dialogConfig.disableClose = true;
    dialogConfig.autoFocus = true;

    dialogConfig.data = {
      id: annotationId,
    };

    const dialogRef = this.dialog.open(DialogGetUserDataComponent, dialogConfig);
    dialogRef.afterClosed()
      .subscribe(data => {
        if (data === true) {
          this.message.info('Deleted from Server');
        } else {
          this.message.info('Not deleted from Server');
        }
      });

  }

  public async changedRankingPositions(annotationArray: IAnnotation[]) {

    let i = 0;
    for (const annotation of annotationArray) {
      if (annotation._id) {
        if (annotation.ranking !== i + 1) {
          annotation.ranking = i + 1;
          this.updateAnnotation(annotation);
        }
        i++;
      }
    }

    // Zoe sagt: ist wahrscheinlich überflüssig, wird durch Update erledigt.
    // 1.1.3
    // - Ranking der Annotation ändern
    /*
    if (this.inSocket) {
      const IdArray = new Array();
      const RankingArray = new Array();
      for (const annotation of this.annotations) {
        IdArray.push(annotation._id);
        RankingArray.push(annotation.ranking);
      }
      // Send ID's & new Ranking of changed annotations
      if (this.inSocket) {
        this.socket.emit('changeRanking', {oldRanking: IdArray, newRanking: RankingArray});
      }
    }*/
  }



  private async fetchAnnotations(model: string, compilation?: string): Promise<IAnnotation[]> {
    return new Promise<IAnnotation[]>(async (resolve, reject) => {
      const annotationList: IAnnotation[] = await this.dataService
        .findAnnotations(model, (compilation) ? compilation : '');
      resolve(annotationList);
    });
  }

  public async redrawMarker() {

    if (!this.inSocket) {
      await this.annotationmarkerService.deleteAllMarker();

      for (const annotation of this.annotations) {
        const color = 'black';
        this.annotationmarkerService.createAnnotationMarker(annotation, color);
      }
    } else {
      this.socketService.redrawMarker();
    }
  }

  public drawMarker(newAnnotation: IAnnotation) {
    if (!this.inSocket) {
      const color = 'black';
      this.annotationmarkerService.createAnnotationMarker(newAnnotation, color);
    } else {
      this.socketService.drawMarker(newAnnotation);
    }
  }

  public setSelectedAnnotation(id: string) {
    this.selectedAnnotation.next(id);
  }

  public setEditModeAnnotation(id: string) {
    this.editModeAnnotation.next(id);
  }

  public async shareAnnotation(annotation: IAnnotation) {

    const dialogConfig = new MatDialogConfig();
    dialogConfig.disableClose = true;
    dialogConfig.autoFocus = true;

    dialogConfig.data = {
      modelId: this.currentModel._id,
    };

    const dialogRef = this.dialog.open(DialogShareAnnotationComponent, dialogConfig);
    dialogRef.afterClosed()
      .subscribe(data => {
        if (data.status === true) {
          const copyAnnotation = this.createCopyOfAnnotation(annotation, data.collectionId, data.annotationListLength);

          this.mongo.updateAnnotation(copyAnnotation)
            .subscribe(result => {
              console.log('Status1: ', result);
              if (result.status === 'ok') {
                this.message.error('Annotation is shared to Collection with id: ' + data.collectionId);
              } else {
                console.log('Status: ', result);
              }
            }, error => {
              this.message.error('Annotation can not be shared.');
            });
        } else {
          this.message.error('Annotation has not been shared.');
        }
      });
  }

  public createCopyOfAnnotation(annotation: IAnnotation, collectionId: string,
                                annotationLength: number): any {
    console.log('Erstelle die Kopie');

    let generatedId = this.mongo.generateObjectId();
    // TODO async
    this.mongo.getUnusedObjectId()
      .then(id => generatedId = id)
      .catch(e => console.error(e));

    return {
      validated: false,
      _id: generatedId,
      identifier: generatedId,
      ranking: String(annotationLength + 1),
      creator: annotation.creator,
      created: annotation.created,
      generator: annotation.generator,
      motivation: annotation.motivation,
      lastModifiedBy: {
        type: 'person',
        name: this.userdataService.currentUserData.fullname,
        _id: this.userdataService.currentUserData._id,
      },
      body: annotation.body,
      target: {
        source: {
          relatedModel: this.currentModel._id,
          relatedCompilation: collectionId,
        },
        selector: annotation.target.selector,
      },
    };
  }

  public createDefaultAnnotation(): IAnnotation {
    return {
      validated: true,
      _id: 'DefaultAnnotation',
      identifier: 'DefaultAnnotation',
      ranking: 1,
      creator: {
        type: 'Person',
        name: 'Get User Name',
        _id: 'userID',
      },
      created: '2019-01-18T22:05:31.230Z',
      generator: {
        type: 'Person',
        name: 'Get User Name',
        _id: 'Get User ID',
      },
      generated: 'Creation-Timestamp by Server',
      motivation: 'defaultMotivation',
      lastModificationDate: 'Last-Manipulation-Timestamp by Server',
      lastModifiedBy: {
        type: 'Person',
        name: 'Get User Name',
        _id: 'Get User ID',
      },
      body: {
        type: 'annotation',
        content: {
          type: 'text',
          title: 'Welcome to Kompakkt',
          description: '![alt Kompakkt Logo](https://raw.githubusercontent.com/DH-Cologne/Kompakkt/master/src/assets/img/kompakkt-logo.png)' +
            'Hi! I am an annotation of this cool logo. Please feel free to add a friend for me by clicking on the edit button in the corner on the right bottom and double click this 3D logo!',
          relatedPerspective: {
            cameraType: 'arcRotateCam',
            position: {
              x: 2.7065021761026817,
              y: 1.3419080619941322,
              z: 90.44884111420268,
            },
            target: {
              x: 0,
              y: 0,
              z: 0,
            },
            preview: 'data:image/png;base64,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KfdQBMipjnPPPTcmTJgQw4YNK/f26quvlsGyefPmHhk5mUBfCAiQvlB2jaYEzjjjjJgyZUo899xzZZ19+/bFmjVrjv9Fv2jRsQA58WJTp06NadOmRfHKqKtj8ODBMXbs2PJppfir2+cv/ij+6ZXfxs//cuyxV1jrtx+KWX9+dVli//79sXr178Kk87Fz58548skny2A73VGE23XXXRcTJ048bdAVNYq9jRs3rtx/YVEEysKFC4VKU3eVxSkEBEgKRTWSC4waNSrmzp0b1157bRw+fDi2bNkSxS/nUx2ff/55PP744w3vofhlPHv27PIJ5HTHmDFjYuvWrfH111+Xp51zzjlx4MCBk5bs3bs3HnnkkXKfzR433HBDQ6FSXGf8+PHla7kzzzwz1q1bFwsWLCg/c+kuvJrdo/UEfi8gQNwLLSEwaNCgmDVrVhSvdo4ePRrFL+VTvRYqNvvNN9/EkiVLunziqNJQ8dRQhFbx9NHIUezx5ZdfLp8GevMoPh+58cYb44ILLiiDorujeIoaOnRo+fprw4YNpdOHH354LAS7W+/nBHoiIEB6ouXcpALFL7o333yzrHnkyJEyMIpXQ6c6iqeA++67L+n1T1fs9ttvL1+bnX322ced9u6778bzzz/fZ/s41YWKz0luueWWGDlyZPlKq7ujeNIqwrEIoCL4XnzxxXj77bfj22+P/7ynuzp+TuBEAQHinugzgeK/7u+55564++67y2sWr56KV1NdHdu2bYsnnniiz/ZX5wsVQTdjxozy22aNHEUIFh/+Owg0IyBAmtGztluByZMnx7PPPlu+UimOFStWlK+gujrmz58fK1euLP9L2VFdoAjr4ttot95660lPUUXVZ555pnpxKwn8v4AAcSskFyg+oL733nvLusWH0MWTxOlelzz44IOn/HA6+cYyL1i8wrrwwgvLMC/+kKODQLMCAqRZQetPEii+Mjtz5swuZd5666147bXXfFvIvUOg5gICpOYDbMXtX3755XH//fcft7V58+aV3wpyECDQPgICpH1m2VKdFN8OKr6CumPHjpbal80QIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQESDpLlQgQIJCVgADJatyaJUCAQDoBAZLOUiUCBAhkJSBAshq3ZgkQIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQESDpLlQgQIJCVgADJatyaJUCAQDoBAZLOUiUCBAhkJSBAshq3ZgkQIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQESDpLlQgQIJCVgADJatyaJUCAQDoBAZLOUiUCBAhkJSBAshq3ZgkQIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQESDpLlQgQIJCVgADJatyaJUCAQDoBAZLOUiUCBAhkJSBAshq3ZgkQIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQESDpLlQgQIJCVgADJatyaJUCAQDoBAZLOUiUCBAhkJSBAshq3ZgkQIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQESDpLlQgQIJCVgADJatyaJUCAQDoBAZLOUiUCBAhkJSBAshq3ZgkQIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQESDpLlQgQIJCVgADJatyaJUCAQDoBAZLOUiUCBAhkJSBAshq3ZgkQIJBOQICks1SJAAECWQkIkKzGrVkCBAikExAg6SxVIkCAQFYCAiSrcWuWAAEC6QQGpCulEgECBAjkJCBAcpq2XgkQIJBQQIAkxFSKAAECOQkIkJymrVcCBAgkFBAgCTGVIkCAQE4CAiSnaeuVAAECCQUESEJMpQgQIJCTgADJadp6JUCAQEIBAZIQUykCBAjkJCBAcpq2XgkQIJBQQIAkxFSKAAECOQkIkJymrVcCBAgkFBAgCTGVIkCAQE4CAiSnaeuVAAECCQUESEJMpQgQIJCTgADJadp6JUCAQEIBAZIQUykCBAjkJCBAcpq2XgkQIJBQQIAkxFSKAAECOQkIkJymrVcCBAgkFBAgCTGVIkCAQE4CAiSnaeuVAAECCQUESEJMpQgQIJCTgADJadp6JUCAQEIBAZIQUykCBAjkJCBAcpq2XgkQIJBQQIAkxFSKAAECOQkIkJymrVcCBAgkFBAgCTGVIkCAQE4C/weLi1NGQXXHbQAAAABJRU5ErkJggg==',
          },
        },
      },
      target: {
        source: {
          relatedModel: 'Cube',
        },
        selector: {
          referencePoint: {
            x: -10.204414220764392,
            y: 10.142734374740286,
            z: -3.9197811803792177,
          },
          referenceNormal: {
            x: -0.8949183602315889,
            y: 0.011999712324764563,
            z: -0.44606853220612525,
          },
        },
      },
    };
  }

  public setAnnotatingAllowance() {

    if (this.isOpen && !this.isMeshSettingsMode) {
      if (this.isCollectionInputSelected) {
        this.annotationMode(true);
        this.isAnnotatingAllowed = true;
        this.annnotatingAllowed.emit(true);
        this.socketService.setBroadcastingAllowance(true);
      } else {
        this.loadModelService.isDefaultModelLoaded ?
          this.socketService.setBroadcastingAllowance(true) :
          this.socketService.setBroadcastingAllowance(false);
        this.isAnnotatingAllowed = this.userdataService.isModelOwner ||
          this.loadModelService.isDefaultModelLoaded;
        this.annotationMode(this.isAnnotatingAllowed);
        this.annnotatingAllowed.emit(this.isAnnotatingAllowed);
      }
    } else {
      this.socketService.setBroadcastingAllowance(false);
      this.isAnnotatingAllowed = false;
      this.annotationMode(false);
      this.annnotatingAllowed.emit(false);
    }
  }

  public setCollectionInput(selected: boolean) {
    this.isCollectionInputSelected = selected;
    this.toggleAnnotationSource(selected, false);
    this.setAnnotatingAllowance();
  }

  // Das aktuelle Modell wird anklickbar und damit annotierbar
  public annotationMode(value: boolean) {
    this.actualModelMeshes.forEach(mesh => {
      this.actionService.pickableModel(mesh, value);
    });
  }

  public toggleAnnotationSource(sourceCol: boolean, initial?: boolean) {

    if (initial) {
      this.annotations = JSON.parse(JSON.stringify(this.isannotationSourceCollection ?
        this.collectionAnnotationsSorted : this.defaultAnnotationsSorted));
      this.redrawMarker();
    } else {
      if (sourceCol === this.isannotationSourceCollection) {
        return;
      } else {
        this.isannotationSourceCollection = sourceCol;
        this.annotations = JSON.parse(JSON.stringify(this.isannotationSourceCollection ?
          this.collectionAnnotationsSorted : this.defaultAnnotationsSorted));
        this.redrawMarker();
      }
    }
  }

}
