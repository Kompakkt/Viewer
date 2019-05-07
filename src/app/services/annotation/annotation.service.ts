import {moveItemInArray} from '@angular/cdk/drag-drop';
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
import {DataService} from '../data/data.service';
import {MessageService} from '../message/message.service';
import {MongohandlerService} from '../mongohandler/mongohandler.service';
import {OverlayService} from '../overlay/overlay.service';
import {ProcessingService} from '../processing/processing.service';
import {UserdataService} from '../userdata/userdata.service';

@Injectable({
  providedIn: 'root',
})

export class AnnotationService {

  private isDemoMode: boolean;
  private isDefaultModelLoaded: boolean;

  public isBroadcasting: boolean;

  private isMeshSettingsMode: boolean;
  public isAnnotatingAllowed = false;
  @Output() annnotatingAllowed: EventEmitter<boolean> = new EventEmitter();

  public isCollectionInputSelected: boolean;
  private isCollectionLoaded: boolean;
  private isObjectFeaturesOpen = false;

  private _annotations: IAnnotation[] = [];
  public readonly annotations = new Proxy(this._annotations, {
      get: (obj, prop) => {
        // After splicing or pushing to this.annotations we want to
        // update the currentAnnotations Subject.
        // Use setTimeout with time 0 to append it to the end of the
        // JavaScript execution queue
        try { return obj[prop]; } finally {
          if (['splice', 'push'].includes(prop.toString())) {
            setTimeout(() => this.updateCurrentAnnotationsSubject(), 0);
          }
        }
      },
    });

  private actualModel: IModel;
  public actualCompilation: ICompilation;
  private actualModelMeshes: BABYLON.Mesh[] = [];

  private isannotationSourceCollection = false;
  @Output() annotationSourceCollection: EventEmitter<boolean> = new EventEmitter();

  private selectedAnnotation: BehaviorSubject<string> = new BehaviorSubject('');
  public isSelectedAnnotation = this.selectedAnnotation.asObservable();

  private editModeAnnotation: BehaviorSubject<string> = new BehaviorSubject('');
  public isEditModeAnnotation = this.editModeAnnotation.asObservable();

  private currentAnnotationSubject: BehaviorSubject<IAnnotation[]> = new BehaviorSubject([]);
  public currentAnnotations = this.currentAnnotationSubject.asObservable();

  constructor(private babylonService: BabylonService,
              private dataService: DataService,
              private actionService: ActionService,
              private annotationmarkerService: AnnotationmarkerService,
              private mongo: MongohandlerService,
              private message: MessageService,
              public socket: Socket,
              private processingService: ProcessingService,
              private cameraService: CameraService,
              private dialog: MatDialog,
              private userdataService: UserdataService,
              private overlayService: OverlayService) {

    this.isCollectionLoaded = this.processingService.isCollectionLoaded;
    this.isMeshSettingsMode = this.overlayService.editorIsOpen;
    this.isDemoMode = this.processingService.isDefaultModelLoaded
      || this.processingService.isFallbackModelLoaded;

    this.isCollectionInputSelected = false;
    this.isDefaultModelLoaded = this.processingService.isDefaultModelLoaded;

    this.processingService.Observables.actualModel.subscribe(actualModel => {
      this.actualModel = actualModel;
    });

    this.processingService.Observables.actualModelMeshes.subscribe(actualModelMeshes => {
      this.actualModelMeshes = actualModelMeshes;
      this.loadAnnotations();
    });

    this.processingService.Observables.actualCollection.subscribe(actualCompilation => {
      if (!actualCompilation) {
        this.isCollectionLoaded = false;
        return;
      }
      actualCompilation._id ? this.isCollectionLoaded = true : this.isCollectionLoaded = false;
      this.actualCompilation = actualCompilation;
    });

    this.overlayService.editor.subscribe(open => {
      this.isObjectFeaturesOpen = open;
      this.setAnnotatingAllowance();
    });

    this.overlayService.editorSetting.subscribe(meshSettingsMode => {
      this.isMeshSettingsMode = meshSettingsMode;
      this.setAnnotatingAllowance();
    });

    this.processingService.defaultModelLoaded.subscribe(defaultLoad => {
      this.isDemoMode = defaultLoad;
      this.isDefaultModelLoaded = defaultLoad;
    });

    this.processingService.fallbackModelLoaded.subscribe(fallback => {
      this.isDemoMode = fallback;
    });

    this.annotationmarkerService.isSelectedAnnotation.subscribe(selectedAnno => {
      this.selectedAnnotation.next(selectedAnno);
    });

  }

  private getDefaultAnnotations() {
    return this.annotations.filter(annotation =>
      !annotation.target.source.relatedCompilation
      || annotation.target.source.relatedCompilation === '');
  }

  private getCompilationAnnotations() {
    return this.annotations.filter(annotation =>
      annotation.target.source.relatedCompilation !== undefined
      && annotation.target.source.relatedCompilation.length > 0);
  }

  private updateCurrentAnnotationsSubject() {
    const next = (this.isannotationSourceCollection)
      ? this.getCompilationAnnotations()
      : this.getDefaultAnnotations();
    this.currentAnnotationSubject
      .next(next);
    this.redrawMarker();
  }

  public getCurrentAnnotations() {
    // This function should not be used in DOM
    // If you need current annotations in DOM, subscribe to the
    // currentAnnotations Observable using the async pipe
    // e.g. (annotationService.currentAnnotations | async)
    return (this.isannotationSourceCollection)
      ? this.getCompilationAnnotations()
      : this.getDefaultAnnotations();
  }

  public async moveAnnotationByIndex(from_index: number, to_index: number) {
    await this.sortAnnotations();
    // Since all annotations are in the same array but sorted
    // with defaults first and compilation following
    // we can calculate the offset if needed
    const offset = (this.isannotationSourceCollection)
      ? this.getDefaultAnnotations().length : 0;
    moveItemInArray(this.annotations, from_index + offset, to_index + offset);
    await this.changedRankingPositions();
  }

  public async loadAnnotations() {

    BABYLON.Tags.AddTagsTo(this.actualModelMeshes, this.actualModel._id);
    // this.annotations = [];
    this.selectedAnnotation.next('');
    this.editModeAnnotation.next('');
    await this.annotationmarkerService.deleteAllMarker();

    if (!this.isDemoMode) {
      // Filter null/undefined annotations
      const serverAnnotations = this.getAnnotationsfromServerDB()
        .filter(annotation => annotation && annotation._id && annotation.lastModificationDate);
      const pouchAnnotations = (await this.getAnnotationsfromLocalDB())
        .filter(annotation => annotation && annotation._id && annotation.lastModificationDate);
      // Update and sort local
      await this.updateLocalDB(pouchAnnotations, serverAnnotations);
      const updated = await this.updateAnnotationList(pouchAnnotations, serverAnnotations);
      this.annotations.push(...updated);
      await this.sortAnnotations();
    } else {
      this.annotations.push(this.createDefaultAnnotation());
      this.selectedAnnotation.next(this.annotations[this.annotations.length - 1]._id);

    }
    this.initializeAnnotationMode();
    this.toggleAnnotationSource(false);
    this.setAnnotatingAllowance();
  }

  private getAnnotationsfromServerDB() {
    const serverAnnotations: IAnnotation[] = [];
    // Annotationen vom Server des aktuellen Modells...
    if (this.actualModel.annotationList) {
      this.actualModel.annotationList
        .filter(annotation => annotation && annotation._id)
        .forEach((annotation: IAnnotation) => serverAnnotations.push(annotation));
    }
    // ...und der aktuellen Compilation (if existing)
    if (this.isCollectionLoaded && this.actualCompilation.annotationList) {
      this.actualCompilation.annotationList
        .filter(annotation => annotation && annotation._id)
        .forEach((annotation: IAnnotation) => serverAnnotations.push(annotation));
    }
    console.log('getAnnotationsfromServerDB', serverAnnotations);
    return serverAnnotations;
  }

  private async getAnnotationsfromLocalDB() {
    let pouchAnnotations: IAnnotation[] = await this.fetchAnnotations(this.actualModel._id);
    // Annotationen aus PouchDB des aktuellen Modells und der aktuellen Compilation (if existing)

    if (this.isCollectionLoaded) {
      const _compilationAnnotations = await this.fetchAnnotations(this.actualModel._id
        && this.actualCompilation._id);
      pouchAnnotations = pouchAnnotations.concat(_compilationAnnotations);
    }
    console.log('getAnnotationsfromLocalDB', pouchAnnotations);
    return pouchAnnotations;
  }

  private async updateLocalDB(localAnnotations: IAnnotation[], serverAnnotations: IAnnotation[]) {
    for (const annotation of serverAnnotations) {
      const localAnnotation = localAnnotations
        .find(_localAnnotation => _localAnnotation._id === annotation._id);
      if (!localAnnotation) {
        await this.dataService.updateAnnotation(annotation);
        localAnnotations.push(annotation);
      }
    }
    console.log('updateLocalDB', localAnnotations);
  }

  private async updateAnnotationList(localAnnotations: IAnnotation[],
                                     serverAnnotations: IAnnotation[]) {
    const unsorted: IAnnotation[] = [];
    // Durch alle Annotationen der lokalen DB
    for (const annotation of localAnnotations) {
      const isLastModifiedByMe = annotation.lastModifiedBy._id
        === this.userdataService.currentUserData._id;
      const isCreatedByMe = annotation.creator._id
        === this.userdataService.currentUserData._id;

      // Finde die Annotaion in den Server Annotationen
      const serverAnnotation = serverAnnotations
        .find(_serverAnnotation => _serverAnnotation._id === annotation._id);
      // Wenn sie gefunden wurde aktuellere speichern lokal bzw. server

      if (serverAnnotation) {
        if (!annotation.lastModificationDate || !serverAnnotation.lastModificationDate) continue;
        // vergleichen welche aktueller ist
        const isSame = annotation.lastModificationDate === serverAnnotation.lastModificationDate;
        const isLocalNewer = annotation.lastModificationDate > serverAnnotation.lastModificationDate;
        if (isLocalNewer || isSame) {
          if (!isSame) {
            // Update Server
            this.mongo.updateAnnotation(annotation);
            serverAnnotations.splice(localAnnotations
              .findIndex(ann => ann._id === serverAnnotation._id), 1, annotation);
          }
          unsorted.push(annotation);
        } else {
          // Update local DB
          await this.dataService.updateAnnotation(serverAnnotation);
          localAnnotations
            .splice(localAnnotations.findIndex(ann => ann._id === annotation._id), 1, serverAnnotation);
          unsorted.push(serverAnnotation);
        }
        // Wenn sie nicht gefunden wurde: Annotation existiert nicht auf dem Server,
        // aber in der Local DB
        // -> wurde gelöscht oder
        // noch nicht gespeichert
      } else {
        // Nicht in Server Annos gefunden
        // Checke, ob local last editor === creator === ich
        if (isLastModifiedByMe && isCreatedByMe) {
          // Annotation auf Server speichern
          // Update Server
          this.mongo.updateAnnotation(annotation);
          serverAnnotations.push(annotation);
          unsorted.push(annotation);
        } else {
          // Nicht local last editor === creator === ich
          // Annotation local löschen
          await this.dataService.deleteAnnotation(annotation._id);
          localAnnotations.splice(localAnnotations.findIndex(ann => ann._id === annotation._id));
        }
      }
    }
    return unsorted;
  }

  private async sortAnnotations() {
    const sortedDefault = this.getDefaultAnnotations()
      .sort((leftSide, rightSide): number =>
        (+leftSide.ranking === +rightSide.ranking) ? 0
          : (+leftSide.ranking < +rightSide.ranking) ? -1 : 1);
    const sortedCompilation = this.getCompilationAnnotations()
      .sort((leftSide, rightSide): number =>
        (+leftSide.ranking === +rightSide.ranking) ? 0
          : (+leftSide.ranking < +rightSide.ranking) ? -1 : 1);

    while (this.annotations.length > 0) {
      this.annotations.pop();
    }
    this.annotations.push(...sortedDefault, ...sortedCompilation);

    await this.changedRankingPositions();
  }

  // For Broadcasting
  public handleReceivedAnnotation(newAnnotation: IAnnotation) {
    // TODO
  }

  public deleteRequestAnnotation(newAnnotation: IAnnotation) {
    // TODO
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
      .then(detailScreenshot => {
        const generatedId = this.mongo.generateObjectId();

        const personName = this.userdataService.currentUserData.fullname;
        const personID = this.userdataService.currentUserData._id;

        const newAnnotation: IAnnotation = {
          validated: (!this.isCollectionLoaded),
          _id: generatedId,
          identifier: generatedId,
          ranking: this.getCurrentAnnotations().length + 1,
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
              relatedModel: this.actualModel._id,
              relatedCompilation: this.isCollectionLoaded ? this.actualCompilation._id : '',
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
    let newAnnotation = annotation;
    newAnnotation.lastModificationDate = new Date().toISOString();
    if (!this.isDemoMode) {
      this.mongo.updateAnnotation(annotation)
        .then((resultAnnotation: IAnnotation) => {
          newAnnotation = resultAnnotation;
        })
        .catch((errorMessage: any) => {
          console.log(errorMessage);
        });
      this.dataService.updateAnnotation(newAnnotation);
    }
    this.drawMarker(newAnnotation);
    this.annotations.push(newAnnotation);
    this.selectedAnnotation.next(newAnnotation._id);
    this.editModeAnnotation.next(newAnnotation._id);


  }

  public updateAnnotation(annotation: IAnnotation) {
    let newAnnotation = annotation;
    newAnnotation.lastModificationDate = new Date().toISOString();
    if (!this.isDemoMode) {
      this.mongo.updateAnnotation(annotation)
        .then((resultAnnotation: IAnnotation) => {
          newAnnotation = resultAnnotation;
        })
        .catch((errorMessage: any) => {
          console.log(errorMessage);
        });
      this.dataService.updateAnnotation(newAnnotation);
    }
    this.annotations
      .splice(this.annotations
        .findIndex(ann => ann._id === annotation._id), 1, newAnnotation);


  }

  public deleteAnnotation(annotation: IAnnotation) {
    if (this.userdataService.isAnnotationOwner(annotation)) {
      this.setSelectedAnnotation('');
      this.setEditModeAnnotation('');
      const index: number = this.annotations.findIndex(ann => ann._id === annotation._id);
      if (index !== -1) {
        this.annotations.splice(this.annotations.findIndex(ann => ann._id === annotation._id), 1);
        this.changedRankingPositions();
        this.redrawMarker();
        if (!this.isDemoMode) {
          this.dataService.deleteAnnotation(annotation._id);
          this.deleteAnnotationFromServer(annotation._id);
        }
      }
    } else {
      this.message.error('You are not the Owner of this Annotation.');
    }


  }

  public deleteAnnotationFromServer(annotationId: string) {
    const username = this.userdataService.cachedLoginData.username;
    const password = this.userdataService.cachedLoginData.password;

    if (username === '' || password === '') {
      this.passwordDialog(annotationId);
    } else {
      this.mongo.deleteRequest(annotationId, 'annotation', username, password)
        .then((result: any) => {
          if (result.status === 'ok') {
            this.message.info('Deleted from Server');
          } else {
            this.message.info('Not deleted from Server');
            this.passwordDialog(annotationId);
          }
        })
        .catch((errorMessage: any) => {
          console.log(errorMessage);
          this.message.error('Annotation can not be deleted from Server.');
        });
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

  private async changedRankingPositions() {
    // Decide whether we iterate over the first part of this.annotations
    // containing all the default annotations or to iterate over the second part
    // containing all of the compilation annotations
    const offset = (this.isannotationSourceCollection)
      ? this.getDefaultAnnotations().length : 0;
    const length = (this.isannotationSourceCollection)
      ? this.annotations.length : this.getDefaultAnnotations().length;
    for (let i = offset; i < length; i++) {
      const annotation = this.annotations[i];
      if (!annotation._id) continue;
      await this.updateAnnotation({...annotation, ranking: i - offset + 1});
    }
  }

  private async fetchAnnotations(model: string, compilation?: string): Promise<IAnnotation[]> {
    return new Promise<IAnnotation[]>(async (resolve, reject) => {
      const annotationList: IAnnotation[] = await this.dataService
        .findAnnotations(model, (compilation) ? compilation : '');
      resolve(annotationList);
    });
  }

  public async redrawMarker() {
    if (!this.isBroadcasting) {
      await this.annotationmarkerService.deleteAllMarker();
      for (const annotation of this.getCurrentAnnotations()) {
        const color = 'black';
        this.annotationmarkerService.createAnnotationMarker(annotation, color);
      }
    } else {
      return;
    }
  }

  public drawMarker(newAnnotation: IAnnotation) {
    if (!this.isBroadcasting) {
      const color = 'black';
      this.annotationmarkerService.createAnnotationMarker(newAnnotation, color);
    } else {
      return;
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
      modelId: this.actualModel._id,
    };

    const dialogRef = this.dialog.open(DialogShareAnnotationComponent, dialogConfig);
    dialogRef.afterClosed()
      .toPromise()
      .then(data => {
        if (data.status !== true) {
          return this.message.error('Annotation has not been shared.');
        }
        const copyAnnotation =
          this.createCopyOfAnnotation(annotation, data.collectionId, data.annotationListLength);

        this.mongo.updateAnnotation(copyAnnotation)
          .then(result => {
            if (result.status === 'ok') {
              this.message.info(`Annotation is shared to Collection with id: ${data.collectionId}`);
            } else {
              console.log('Status:', result);
            }
          })
          .catch(() => this.message.error('Annotation can not be shared.'));
      });
  }

  public createCopyOfAnnotation(annotation: IAnnotation, collectionId: string,
                                annotationLength: number): any {
    console.log('Erstelle die Kopie');

    const generatedId = this.mongo.generateObjectId();

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
          relatedModel: this.actualModel._id,
          relatedCompilation: collectionId,
        },
        selector: annotation.target.selector,
      },
    };
  }

  public setAnnotatingAllowance() {
    let emitBool = false;
    emitBool = (this.isObjectFeaturesOpen && !this.isMeshSettingsMode);
    if (emitBool && !this.isCollectionInputSelected) {
      emitBool = (this.userdataService.isModelOwner && !this.processingService.isCollectionLoaded ||
        this.isDefaultModelLoaded);
    }
    this.isAnnotatingAllowed = emitBool;
    this.annotationMode(emitBool);
    this.annnotatingAllowed.emit(emitBool);
    this.annotationMode(emitBool);
  }

  public setCollectionInput(selected: boolean) {
    this.isCollectionInputSelected = selected;
    this.toggleAnnotationSource(selected);
    this.setAnnotatingAllowance();
  }

  // Das aktuelle Modell wird anklickbar und damit annotierbar
  public annotationMode(value: boolean) {
    this.actualModelMeshes.forEach(mesh => {
      this.actionService.pickableModel(mesh, value);
    });
  }

  public toggleAnnotationSource(sourceCol: boolean) {
    if (sourceCol !== this.isannotationSourceCollection) {
      this.isannotationSourceCollection = sourceCol;
      this.updateCurrentAnnotationsSubject();
    }
  }

  public createDefaultAnnotation(): IAnnotation {
    /* tslint:disable:max-line-length */
    const defaultPreview = 'assets/img/preview-default-annotation.png';
    const fallbackPreview = 'assets/img/preview-fallback-annotation.png';

    const defaultRefPoint = {x: -11.161506782568708, y: 12.026446528767236, z: -4.190899716371533};
    const fallbackRefPoint = {x: -10.204414220764392, y: 10.142734374740286, z: -3.9197811803792177};

    const defaultRefNormal = {x: -0.8949183554821707, y: 0.011999712767034331, z: -0.44606854172267707};
    const fallbackRefNormal = {x: -0.8949183602315889, y: 0.011999712324764563, z: -0.44606853220612525};

    const defaultTitle = 'Welcome to Kompakkt';
    const defaultMessage =
      `![alt Kompakkt Logo](https://raw.githubusercontent.com/DH-Cologne/Kompakkt/master/src/assets/img/kompakkt-logo.png)
      Hi! I am an annotation of this cool logo. Please feel free to add a friend for me by clicking on the edit button in the corner on the right bottom and double click this 3D logo!`;
    const fallbackTitle = 'Hi there!';
    const fallbackMessage = 'maybe this is not what you were looking for. Unfortunately we cannot display the requested object but we are working on it. But we have something better as you can see... This model is from https://sketchfab.com/mark2580';
    /* tslint:enable:max-line-length */

    return {
      validated: true,
      _id: 'DefaultAnnotation',
      identifier: 'DefaultAnnotation',
      ranking: 1,
      creator: {
        type: 'Person',
        name: 'Get User Name',
        _id: 'Get User ID',
      },
      created: new Date().toISOString(),
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
          title: (this.processingService.isFallbackModelLoaded) ? fallbackTitle : defaultTitle,
          description: (this.processingService.isFallbackModelLoaded) ? fallbackMessage : defaultMessage,
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
            preview: (this.processingService.isFallbackModelLoaded) ? fallbackPreview : defaultPreview,
          },
        },
      },
      target: {
        source: {
          relatedModel: 'Cube',
        },
        selector: {
          referencePoint: (this.processingService.isFallbackModelLoaded) ? fallbackRefPoint : defaultRefPoint,
          referenceNormal: (this.processingService.isFallbackModelLoaded) ? fallbackRefNormal : defaultRefNormal,
        },
      },
    };
  }

}
