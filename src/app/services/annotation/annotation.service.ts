import { moveItemInArray } from '@angular/cdk/drag-drop';
import { Injectable } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { Mesh, Tags } from 'babylonjs';
import { Socket } from 'ngx-socket-io';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';

import {
  annotationFallback,
  annotationLogo,
} from '../../../assets/annotations/annotations';
import { environment } from '../../../environments/environment';
// tslint:disable-next-line:max-line-length
import { DialogGetUserDataComponent } from '../../components/dialogs/dialog-get-user-data/dialog-get-user-data.component';
// tslint:disable-next-line:max-line-length
import { DialogShareAnnotationComponent } from '../../components/dialogs/dialog-share-annotation/dialog-share-annotation.component';
import {
  IAnnotation,
  ICompilation,
  IEntity,
} from '../../interfaces/interfaces';
import { AnnotationmarkerService } from '../annotationmarker/annotationmarker.service';
import { BabylonService } from '../babylon/babylon.service';
import { DataService } from '../data/data.service';
import { MessageService } from '../message/message.service';
import { BackendService } from '../backend/backend.service';
import { ProcessingService } from '../processing/processing.service';
import { UserdataService } from '../userdata/userdata.service';

@Injectable({
  providedIn: 'root',
})
export class AnnotationService {
  // What is actually going on and what is loaded? external Infos
  private actualEntity: IEntity | undefined;
  private actualEntityMeshes: Mesh[] = [];
  public actualCompilation: ICompilation | undefined;

  // All about annotations
  private selectedAnnotation = new BehaviorSubject('');
  public isSelectedAnnotation = this.selectedAnnotation.asObservable();
  private editModeAnnotation = new BehaviorSubject('');
  public isEditModeAnnotation = this.editModeAnnotation.asObservable();
  private currentAnnotationSubject = new BehaviorSubject([] as IAnnotation[]);
  public currentAnnotations = this.currentAnnotationSubject.asObservable();

  private _annotations: IAnnotation[] = [];
  public readonly annotations = new Proxy(this._annotations, {
    get: (obj, prop) => {
      // After splicing or pushing to this.annotations we want to
      // update the currentAnnotations Subject.
      // Use setTimeout with time 0 to append it to the end of the
      // JavaScript execution queue
      try {
        return obj[prop];
      } finally {
        if (['splice', 'push'].includes(prop.toString())) {
          setTimeout(() => this.updateCurrentAnnotationsSubject(), 0);
        }
      }
    },
  });

  constructor(
    private dataService: DataService,
    private annotationmarkerService: AnnotationmarkerService,
    private babylon: BabylonService,
    private backend: BackendService,
    private message: MessageService,
    public socket: Socket,
    private processingService: ProcessingService,
    private dialog: MatDialog,
    private userdataService: UserdataService,
  ) {
    // What is actually going on and what is loaded? external Infos
    this.processingService.Observables.actualEntity.subscribe(actualEntity => {
      this.actualEntity = actualEntity;
    });

    this.processingService.Observables.actualEntityMeshes.subscribe(
      actualEntityMeshes => {
        this.actualEntityMeshes = actualEntityMeshes;
      },
    );

    this.processingService.Observables.actualCompilation.subscribe(
      actualCompilation => {
        this.actualCompilation = actualCompilation;
      },
    );

    this.processingService.loadAnnotations.subscribe(load => {
      if (load) this.loadAnnotations();
    });

    this.processingService.initialiseEntityForAnnotating.subscribe(init => {
      if (init) this.initializeAnnotationMode();
    });

    this.processingService.setAnnotationAllowance.subscribe(allowance => {
      console.log('ich setze das mesh als', allowance);
      this.annotationMode(allowance);
    });

    this.annotationmarkerService.isSelectedAnnotation.subscribe(
      selectedAnno => {
        this.selectedAnnotation.next(selectedAnno);
      },
    );
  }

  private getDefaultAnnotations() {
    return this.annotations.filter(
      annotation =>
        !annotation.target.source.relatedCompilation ||
        annotation.target.source.relatedCompilation === '',
    );
  }

  private getCompilationAnnotations() {
    return this.annotations.filter(
      annotation =>
        annotation.target.source.relatedCompilation !== undefined &&
        annotation.target.source.relatedCompilation.length > 0,
    );
  }

  private updateCurrentAnnotationsSubject() {
    const next = this.processingService.compilationLoaded
      ? this.getCompilationAnnotations()
      : this.getDefaultAnnotations();
    this.currentAnnotationSubject.next(next);
    // After the observable updates we want to redraw markers
    setTimeout(() => this.redrawMarker(), 0);
  }

  public getCurrentAnnotations() {
    // This function should not be used in DOM
    // If you need current annotations in DOM, subscribe to the
    // currentAnnotations Observable using the async pipe
    // e.g. (annotationService.currentAnnotations | async)
    return this.processingService.compilationLoaded
      ? this.getCompilationAnnotations()
      : this.getDefaultAnnotations();
  }

  public async moveAnnotationByIndex(from_index: number, to_index: number) {
    await this.sortAnnotations();
    // Since all annotations are in the same array but sorted
    // with defaults first and compilation following
    // we can calculate the offset if needed
    const offset = this.processingService.compilationLoaded
      ? this.getDefaultAnnotations().length
      : 0;
    moveItemInArray(this.annotations, from_index + offset, to_index + offset);
    await this.changedRankingPositions();
  }

  public async loadAnnotations() {
    if (!this.actualEntity) {
      throw new Error('ActualEntity missing');
    }
    Tags.AddTagsTo(this.actualEntityMeshes, this.actualEntity._id);
    this.selectedAnnotation.next('');
    this.editModeAnnotation.next('');
    await this.annotationmarkerService.deleteAllMarker();
    this.annotations.splice(0, this.annotations.length);

    if (
      !this.processingService.defaultEntityLoaded &&
      !this.processingService.fallbackEntityLoaded
    ) {
      // Filter null/undefined annotations
      const serverAnnotations = this.getAnnotationsfromServerDB().filter(
        annotation =>
          annotation && annotation._id && annotation.lastModificationDate,
      );
      const pouchAnnotations = (await this.getAnnotationsfromLocalDB()).filter(
        annotation =>
          annotation && annotation._id && annotation.lastModificationDate,
      );
      // Update and sort local
      await this.updateLocalDB(pouchAnnotations, serverAnnotations);
      const updated = await this.updateAnnotationList(
        pouchAnnotations,
        serverAnnotations,
      );
      this.annotations.push(...updated);
      await this.sortAnnotations();
    } else {
      if (this.processingService.fallbackEntityLoaded) {
        this.annotations.push(annotationFallback);
      }
      if (this.processingService.defaultEntityLoaded) {
        if (
          this.processingService.annotatingFeatured &&
          annotationLogo.length
        ) {
          annotationLogo.forEach((annotation: IAnnotation) =>
            this.annotations.push(annotation),
          );
        }
      }
      if (this.annotations.length) {
        this.selectedAnnotation.next(this.annotations[0]._id);
      }
    }
  }

  private getAnnotationsfromServerDB() {
    const serverAnnotations: IAnnotation[] = [];
    // Annotationen vom Server des aktuellen Entityls...
    if (this.actualEntity && this.actualEntity.annotationList) {
      (this.actualEntity.annotationList.filter(
        annotation => annotation && annotation._id,
      ) as IAnnotation[]).forEach((annotation: IAnnotation) =>
        serverAnnotations.push(annotation),
      );
    }
    // ...und der aktuellen Compilation (if existing)
    if (
      this.actualEntity &&
      this.actualEntity._id &&
      this.processingService.compilationLoaded &&
      this.actualCompilation &&
      this.actualCompilation.annotationList
    ) {
      const entityID = this.actualEntity._id;
      (this.actualCompilation.annotationList.filter(
        annotation =>
          annotation &&
          annotation._id &&
          annotation.target.source.relatedEntity === entityID,
      ) as IAnnotation[]).forEach((annotation: IAnnotation) =>
        serverAnnotations.push(annotation),
      );
    }
    console.log('getAnnotationsfromServerDB', serverAnnotations);
    return serverAnnotations;
  }

  private async getAnnotationsfromLocalDB() {
    let pouchAnnotations: IAnnotation[] = this.actualEntity
      ? await this.fetchAnnotations(this.actualEntity._id)
      : [];
    // Annotationen aus PouchDB des aktuellen Entityls und der aktuellen Compilation (if existing)

    if (this.processingService.compilationLoaded) {
      const _compilationAnnotations =
        this.actualEntity && this.actualCompilation
          ? await this.fetchAnnotations(
              this.actualEntity._id && this.actualCompilation._id,
            )
          : [];
      pouchAnnotations = pouchAnnotations.concat(_compilationAnnotations);
    }
    console.log('getAnnotationsfromLocalDB', pouchAnnotations);
    return pouchAnnotations;
  }

  private async updateLocalDB(
    localAnnotations: IAnnotation[],
    serverAnnotations: IAnnotation[],
  ) {
    for (const annotation of serverAnnotations) {
      const localAnnotation = localAnnotations.find(
        _localAnnotation => _localAnnotation._id === annotation._id,
      );
      if (!localAnnotation) {
        await this.dataService.updateAnnotation(annotation);
        localAnnotations.push(annotation);
      }
    }
    console.log('updateLocalDB', localAnnotations);
  }

  private async updateAnnotationList(
    localAnnotations: IAnnotation[],
    serverAnnotations: IAnnotation[],
  ) {
    const unsorted: IAnnotation[] = [];
    // Durch alle Annotationen der lokalen DB
    for (const annotation of localAnnotations) {
      const isLastModifiedByMe = this.userdataService.userData
        ? annotation.lastModifiedBy._id === this.userdataService.userData._id
        : false;
      const isCreatedByMe = this.userdataService.userData
        ? annotation.creator._id === this.userdataService.userData._id
        : false;

      // Finde die Annotaion in den Server Annotationen
      const serverAnnotation = serverAnnotations.find(
        _serverAnnotation => _serverAnnotation._id === annotation._id,
      );
      // Wenn sie gefunden wurde aktuellere speichern lokal bzw. server

      if (serverAnnotation) {
        if (
          !annotation.lastModificationDate ||
          !serverAnnotation.lastModificationDate
        ) {
          continue;
        }
        // vergleichen welche aktueller ist
        const isSame =
          annotation.lastModificationDate ===
          serverAnnotation.lastModificationDate;
        const isLocalNewer =
          annotation.lastModificationDate >
          serverAnnotation.lastModificationDate;
        if (isLocalNewer || isSame) {
          if (!isSame) {
            // Update Server
            this.backend.updateAnnotation(annotation);
            serverAnnotations.splice(
              localAnnotations.findIndex(
                ann => ann._id === serverAnnotation._id,
              ),
              1,
              annotation,
            );
          }
          unsorted.push(annotation);
        } else {
          // Update local DB
          await this.dataService.updateAnnotation(serverAnnotation);
          localAnnotations.splice(
            localAnnotations.findIndex(ann => ann._id === annotation._id),
            1,
            serverAnnotation,
          );
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
          this.backend.updateAnnotation(annotation);
          serverAnnotations.push(annotation);
          unsorted.push(annotation);
        } else {
          // Nicht local last editor === creator === ich
          // Annotation local löschen
          await this.dataService.deleteAnnotation(annotation._id);
          localAnnotations.splice(
            localAnnotations.findIndex(ann => ann._id === annotation._id),
          );
        }
      }
    }
    return unsorted;
  }

  private async sortAnnotations() {
    const sortedDefault = this.getDefaultAnnotations().sort(
      (leftSide, rightSide): number =>
        +leftSide.ranking === +rightSide.ranking
          ? 0
          : +leftSide.ranking < +rightSide.ranking
          ? -1
          : 1,
    );
    const sortedCompilation = this.getCompilationAnnotations().sort(
      (leftSide, rightSide): number =>
        +leftSide.ranking === +rightSide.ranking
          ? 0
          : +leftSide.ranking < +rightSide.ranking
          ? -1
          : 1,
    );

    this.annotations.splice(0, this.annotations.length);
    this.annotations.push(...sortedDefault, ...sortedCompilation);

    await this.changedRankingPositions();
  }

  // Die Annotationsfunktionalität wird zue aktuellen Entity hinzugefügt
  public initializeAnnotationMode() {
    this.babylon.getCanvas().ondblclick = () => {
      const scene = this.babylon.getScene();
      const result = scene.pick(scene.pointerX, scene.pointerY);
      if (result && result.pickedMesh && result.pickedMesh.isPickable) {
        console.log('Picked', result);
        this.createNewAnnotation(result);
      }
    };
    this.annotationMode(false);
  }

  // Das aktuelle Entityl wird anklickbar und damit annotierbar
  public annotationMode(value: boolean) {
    if (
      this.processingService.actualEntityMediaType === 'video' ||
      this.processingService.actualEntityMediaType === 'audio'
    ) {
      return;
    }
    if (value) {
      this.babylon.getCanvas().classList.add('annotation-mode');
    } else {
      this.babylon.getCanvas().classList.remove('annotation-mode');
    }
    this.actualEntityMeshes.forEach(mesh => (mesh.isPickable = value));
  }

  public async createNewAnnotation(result: any) {
    const camera = this.babylon.cameraManager.getInitialPosition();

    this.babylon.createPreviewScreenshot().then(detailScreenshot => {
      if (!this.actualEntity) {
        throw new Error(`this.actualEntity not defined: ${this.actualEntity}`);
      }
      const generatedId = this.backend.generateEntityId();

      const personName = this.userdataService.userData
        ? this.userdataService.userData.fullname
        : 'guest';
      const personID = this.userdataService.userData
        ? this.userdataService.userData._id
        : this.userdataService.guestUserData
        ? this.userdataService.guestUserData._id
        : 'guest';

      const newAnnotation: IAnnotation = {
        validated: !this.processingService.compilationLoaded,
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
            relatedEntity: this.actualEntity._id,
            relatedCompilation:
              this.processingService.compilationLoaded && this.actualCompilation
                ? this.actualCompilation._id
                : '',
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
      this.add(newAnnotation);
    });
  }

  private add(_annotation: IAnnotation): void {
    let newAnnotation = _annotation;
    newAnnotation.lastModificationDate = new Date().toISOString();
    if (
      !this.processingService.defaultEntityLoaded &&
      !this.processingService.fallbackEntityLoaded
    ) {
      this.backend
        .updateAnnotation(_annotation)
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

  public updateAnnotation(_annotation: IAnnotation) {
    let newAnnotation = _annotation;
    newAnnotation.lastModificationDate = new Date().toISOString();
    if (
      !this.processingService.fallbackEntityLoaded &&
      !this.processingService.defaultEntityLoaded
    ) {
      if (
        this.userdataService.isAnnotationOwner(_annotation) ||
        (this.processingService.compilationLoaded &&
          this.userdataService.userOwnsCompilation)
      ) {
        this.backend
          .updateAnnotation(_annotation)
          .then((resultAnnotation: IAnnotation) => {
            newAnnotation = resultAnnotation;
          })
          .catch((errorMessage: any) => {
            console.log(errorMessage);
          });
      }
      this.dataService.updateAnnotation(newAnnotation);
    }
    this.annotations.splice(
      this.annotations.findIndex(ann => ann._id === _annotation._id),
      1,
      newAnnotation,
    );
  }

  public deleteAnnotation(_annotation: IAnnotation) {
    if (this.userdataService.isAnnotationOwner(_annotation)) {
      this.setSelectedAnnotation('');
      this.setEditModeAnnotation('');
      const index: number = this.annotations.findIndex(
        ann => ann._id === _annotation._id,
      );
      if (index !== -1) {
        this.annotations.splice(
          this.annotations.findIndex(ann => ann._id === _annotation._id),
          1,
        );
        this.changedRankingPositions();
        this.redrawMarker();
        if (
          !this.processingService.fallbackEntityLoaded &&
          !this.processingService.defaultEntityLoaded
        ) {
          this.dataService.deleteAnnotation(_annotation._id);
          this.deleteAnnotationFromServer(_annotation._id);
        }
      }
    } else {
      this.message.error('You are not the Owner of this Annotation.');
    }
  }

  public deleteAnnotationFromServer(annotationId: string) {
    const username = this.userdataService.loginData.username;
    const password = this.userdataService.loginData.password;

    if (username === '' || password === '') {
      this.passwordDialog(annotationId);
    } else {
      this.backend
        .deleteRequest(annotationId, 'annotation', username, password)
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
    const dialogRef = this.dialog.open(
      DialogGetUserDataComponent,
      dialogConfig,
    );
    dialogRef.afterClosed().subscribe(data => {
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
    const offset = this.processingService.compilationLoaded
      ? this.getDefaultAnnotations().length
      : 0;
    const length = this.processingService.compilationLoaded
      ? this.annotations.length
      : this.getDefaultAnnotations().length;
    for (let i = offset; i < length; i++) {
      const annotation = this.annotations[i];
      if (!annotation._id) continue;
      await this.updateAnnotation({ ...annotation, ranking: i - offset + 1 });
    }
  }

  private async fetchAnnotations(
    entity: string,
    compilation?: string,
  ): Promise<IAnnotation[]> {
    return new Promise<IAnnotation[]>(async (resolve, _) => {
      const annotationList: IAnnotation[] = await this.dataService.findAnnotations(
        entity,
        compilation ? compilation : '',
      );
      resolve(annotationList);
    });
  }

  public redrawMarker() {
    this.annotationmarkerService
      .deleteAllMarker()
      .then(() => {
        for (const annotation of this.getCurrentAnnotations()) {
          this.drawMarker(annotation);
        }
      })
      .catch(e => console.error(e));
  }

  public drawMarker(newAnnotation: IAnnotation) {
    const color = 'black';
    this.annotationmarkerService.createAnnotationMarker(newAnnotation, color);
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

    if (!this.actualEntity) {
      throw new Error('ActualEntity missing');
    }

    dialogConfig.data = {
      entityId: this.actualEntity._id,
    };

    const dialogRef = this.dialog.open(
      DialogShareAnnotationComponent,
      dialogConfig,
    );
    dialogRef
      .afterClosed()
      .toPromise()
      .then(data => {
        if (data.status !== true) {
          return this.message.error('Annotation has not been shared.');
        }
        const copyAnnotation = this.createCopyOfAnnotation(
          annotation,
          data.collectionId,
          data.annotationListLength,
        );

        this.backend
          .updateAnnotation(copyAnnotation)
          .then(() => {
            this.message.info(
              `Annotation is shared to Collection with id: ${data.collectionId}`,
            );
          })
          .catch(() => this.message.error('Annotation can not be shared.'));
      });
  }

  public createCopyOfAnnotation(
    annotation: IAnnotation,
    collectionId: string,
    annotationLength: number,
  ): any {
    const generatedId = this.backend.generateEntityId();

    if (!this.actualEntity) {
      throw new Error('ActualEntity missing');
    }

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
        name: this.userdataService.userData
          ? this.userdataService.userData.fullname
          : 'guest',
        _id: this.userdataService.userData
          ? this.userdataService.userData._id
          : 'guest',
      },
      body: annotation.body,
      target: {
        source: {
          relatedEntity: this.actualEntity._id,
          relatedCompilation: collectionId,
        },
        selector: annotation.target.selector,
      },
    };
  }
}
