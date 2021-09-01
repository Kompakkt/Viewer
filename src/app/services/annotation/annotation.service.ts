import { moveItemInArray } from '@angular/cdk/drag-drop';
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { IAnnotation, ICompilation, IEntity, isAnnotation } from 'src/common';
import { ActionManager, ExecuteCodeAction, Mesh, Tags, Vector3 } from 'babylonjs';
import { Socket } from 'ngx-socket-io';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';

import { annotationFallback, annotationLogo } from '../../../assets/annotations/annotations';
import { environment } from '../../../environments/environment';
// tslint:disable-next-line:max-line-length
import { DialogGetUserDataComponent } from '../../components/dialogs/dialog-get-user-data/dialog-get-user-data.component';
// tslint:disable-next-line:max-line-length
import { DialogShareAnnotationComponent } from '../../components/dialogs/dialog-share-annotation/dialog-share-annotation.component';
import { BabylonService } from '../babylon/babylon.service';
import { BackendService } from '../backend/backend.service';
import { DataService } from '../data/data.service';
import { MessageService } from '../message/message.service';
import { ProcessingService } from '../processing/processing.service';
import { UserdataService } from '../userdata/userdata.service';

import { createMarker } from './visual3DElements';

@Injectable({
  providedIn: 'root',
})
export class AnnotationService {
  // What is actually going on and what is loaded? external Infos
  private entity: IEntity | undefined;
  private meshes: Mesh[] = [];
  public compilation: ICompilation | undefined;

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
        return (obj as any)[prop] as IAnnotation;
      } finally {
        if (['splice', 'push'].includes(prop.toString())) {
          setTimeout(() => this.updateCurrentAnnotationsSubject(), 0);
        }
      }
    },
  });

  constructor(
    private data: DataService,
    private babylon: BabylonService,
    private backend: BackendService,
    private message: MessageService,
    public socket: Socket,
    private processing: ProcessingService,
    private dialog: MatDialog,
    private userdata: UserdataService,
  ) {
    // What is actually going on and what is loaded? external Infos
    this.processing.entity$.subscribe(entity => {
      this.entity = entity;
    });

    this.processing.meshes$.subscribe(meshes => {
      this.meshes = meshes;
    });

    this.processing.compilation$.subscribe(compilation => {
      this.compilation = compilation;
    });

    this.processing.loadAnnotations.subscribe((load: boolean) => {
      if (load) this.loadAnnotations();
    });

    this.processing.initialiseEntityForAnnotating.subscribe((init: boolean) => {
      if (init) this.initializeAnnotationMode();
    });

    this.processing.setAnnotationAllowance.subscribe((allowance: boolean) => {
      console.log('ich setze das mesh als', allowance);
      this.annotationMode(allowance);
    });
  }

  get isHomepageEntity() {
    return this.entity?._id === 'default' && !this.processing.mode;
  }

  get defaultAnnotations() {
    if (this.isHomepageEntity) return [];
    return this.annotations.filter(
      annotation =>
        !annotation.target.source.relatedCompilation ||
        annotation.target.source.relatedCompilation === '',
    );
  }

  get compilationAnnotations() {
    return this.annotations.filter(
      annotation =>
        annotation.target.source.relatedCompilation !== undefined &&
        annotation.target.source.relatedCompilation.length > 0,
    );
  }

  private updateCurrentAnnotationsSubject() {
    const next = this.processing.compilationLoaded
      ? this.compilationAnnotations
      : this.defaultAnnotations;
    this.currentAnnotationSubject.next(next);
    // After the observable updates we want to redraw markers
    setTimeout(() => this.redrawMarker(), 0);
  }

  public getCurrentAnnotations() {
    // This function should not be used in DOM
    // If you need current annotations in DOM, subscribe to the
    // currentAnnotations Observable using the async pipe
    // e.g. (annotationService.currentAnnotations | async)
    return this.processing.compilationLoaded
      ? this.compilationAnnotations
      : this.defaultAnnotations;
  }

  public async moveAnnotationByIndex(from_index: number, to_index: number) {
    await this.sortAnnotations();
    // Since all annotations are in the same array but sorted
    // with defaults first and compilation following
    // we can calculate the offset if needed
    const offset = this.processing.compilationLoaded ? this.defaultAnnotations.length : 0;
    moveItemInArray(this.annotations, from_index + offset, to_index + offset);
    await this.changedRankingPositions();
  }

  public async loadAnnotations() {
    if (!this.entity) {
      throw new Error('Entity missing');
    }
    Tags.AddTagsTo(this.meshes, this.entity._id.toString());
    this.selectedAnnotation.next('');
    this.editModeAnnotation.next('');
    await this.deleteAllMarker();
    this.annotations.splice(0, this.annotations.length);

    if (!this.processing.defaultEntityLoaded && !this.processing.fallbackEntityLoaded) {
      // Filter null/undefined annotations
      const serverAnnotations = this.getAnnotationsfromServerDB().filter(
        annotation => annotation && annotation._id && annotation.lastModificationDate,
      );
      const pouchAnnotations = (await this.getAnnotationsfromLocalDB()).filter(
        annotation => annotation && annotation._id && annotation.lastModificationDate,
      );
      // Update and sort local
      await this.updateLocalDB(pouchAnnotations, serverAnnotations);
      const updated = await this.updateAnnotationList(pouchAnnotations, serverAnnotations);
      this.annotations.push(...updated);
      await this.sortAnnotations();
    } else {
      if (this.processing.fallbackEntityLoaded) {
        this.annotations.push(annotationFallback);
      }
      if (this.processing.defaultEntityLoaded) {
        if (this.processing.annotatingFeatured && annotationLogo.length) {
          annotationLogo.forEach((annotation: IAnnotation) => this.annotations.push(annotation));
        }
      }
      if (this.annotations.length > 0) {
        this.selectedAnnotation.next(this.annotations[0]._id.toString());
      }
    }
  }

  private getAnnotationsfromServerDB() {
    const serverAnnotations: IAnnotation[] = [];
    // Annotationen vom Server des aktuellen Entityls...
    for (const id in this.entity?.annotations) {
      const anno = this.entity?.annotations[id];
      if (!isAnnotation(anno)) continue;
      serverAnnotations.push(anno);
    }
    // ...und der aktuellen Compilation (if existing)
    if (this.entity?._id && this.processing.compilationLoaded && this.compilation?.annotations) {
      const entityID = this.entity._id;
      for (const id in this.compilation?.annotations) {
        const anno = this.compilation?.annotations[id];
        if (!isAnnotation(anno)) continue;
        if (anno?.target?.source?.relatedEntity !== entityID) continue;
        serverAnnotations.push(anno);
      }
    }
    console.log('getAnnotationsfromServerDB', serverAnnotations);
    return serverAnnotations;
  }

  private async getAnnotationsfromLocalDB() {
    let pouchAnnotations: IAnnotation[] = this.entity
      ? await this.fetchAnnotations(this.entity._id.toString())
      : [];
    // Annotationen aus PouchDB des aktuellen Entityls und der aktuellen Compilation (if existing)

    if (this.processing.compilationLoaded) {
      const _compilationAnnotations =
        this.entity && this.compilation
          ? await this.fetchAnnotations(this.entity._id.toString(), this.compilation._id.toString())
          : [];
      pouchAnnotations = pouchAnnotations.concat(_compilationAnnotations);
    }
    console.log('getAnnotationsfromLocalDB', pouchAnnotations);
    return pouchAnnotations;
  }

  private async updateLocalDB(localAnnotations: IAnnotation[], serverAnnotations: IAnnotation[]) {
    for (const annotation of serverAnnotations) {
      const localAnnotation = localAnnotations.find(
        _localAnnotation => _localAnnotation._id === annotation._id,
      );
      if (!localAnnotation) {
        await this.data.updateAnnotation(annotation);
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
      const isLastModifiedByMe = this.userdata.userData
        ? annotation.lastModifiedBy._id === this.userdata.userData._id
        : false;
      const isCreatedByMe = this.userdata.userData
        ? annotation.creator._id === this.userdata.userData._id
        : false;

      // Finde die Annotaion in den Server Annotationen
      const serverAnnotation = serverAnnotations.find(
        _serverAnnotation => _serverAnnotation._id === annotation._id,
      );
      // Wenn sie gefunden wurde aktuellere speichern lokal bzw. server

      if (serverAnnotation) {
        if (!annotation.lastModificationDate || !serverAnnotation.lastModificationDate) {
          continue;
        }
        // vergleichen welche aktueller ist
        const isSame = annotation.lastModificationDate === serverAnnotation.lastModificationDate;
        const isLocalNewer =
          annotation.lastModificationDate > serverAnnotation.lastModificationDate;
        if (isLocalNewer || isSame) {
          if (!isSame) {
            // Update Server
            this.backend.updateAnnotation(annotation);
            serverAnnotations.splice(
              localAnnotations.findIndex(ann => ann._id === serverAnnotation._id),
              1,
              annotation,
            );
          }
          unsorted.push(annotation);
        } else {
          // Update local DB
          await this.data.updateAnnotation(serverAnnotation);
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
          await this.data.deleteAnnotation(annotation._id.toString());
          localAnnotations.splice(localAnnotations.findIndex(ann => ann._id === annotation._id));
        }
      }
    }
    return unsorted;
  }

  private async sortAnnotations() {
    const sortedDefault = this.defaultAnnotations.sort((leftSide, rightSide): number =>
      +leftSide.ranking === +rightSide.ranking
        ? 0
        : +leftSide.ranking < +rightSide.ranking
        ? -1
        : 1,
    );
    const sortedCompilation = this.compilationAnnotations.sort((leftSide, rightSide): number =>
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
      this.processing.entityMediaType === 'video' ||
      this.processing.entityMediaType === 'audio'
    ) {
      return;
    }
    if (value) {
      this.babylon.getCanvas().classList.add('annotation-mode');
    } else {
      this.babylon.getCanvas().classList.remove('annotation-mode');
    }
    this.meshes.forEach(mesh => (mesh.isPickable = value));
  }

  public async createNewAnnotation(result: any) {
    const camera = this.babylon.cameraManager.getInitialPosition();

    this.babylon.createPreviewScreenshot().then(detailScreenshot => {
      if (!this.entity) {
        throw new Error(`this.entity not defined: ${this.entity}`);
      }
      const generatedId = this.backend.generateEntityId();

      const personName = this.userdata.userData ? this.userdata.userData.fullname : 'guest';
      const personID = this.userdata.userData
        ? this.userdata.userData._id
        : this.userdata.guestUserData
        ? this.userdata.guestUserData._id
        : 'guest';

      const newAnnotation: IAnnotation = {
        validated: !this.processing.compilationLoaded,
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
            relatedEntity: this.entity._id.toString(),
            relatedCompilation:
              this.processing.compilationLoaded && this.compilation
                ? this.compilation._id.toString()
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
    if (!this.processing.defaultEntityLoaded && !this.processing.fallbackEntityLoaded) {
      this.backend
        .updateAnnotation(_annotation)
        .then((resultAnnotation: IAnnotation) => {
          newAnnotation = resultAnnotation;
        })
        .catch((errorMessage: any) => {
          console.log(errorMessage);
        });
      this.data.updateAnnotation(newAnnotation);
    }
    this.drawMarker(newAnnotation);
    this.annotations.push(newAnnotation);
    this.selectedAnnotation.next(newAnnotation._id.toString());
    this.editModeAnnotation.next(newAnnotation._id.toString());
  }

  public updateAnnotation(_annotation: IAnnotation) {
    let newAnnotation = _annotation;
    newAnnotation.lastModificationDate = new Date().toISOString();
    if (!this.processing.fallbackEntityLoaded && !this.processing.defaultEntityLoaded) {
      if (
        this.userdata.isAnnotationOwner(_annotation) ||
        (this.processing.compilationLoaded && this.userdata.userOwnsCompilation)
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
      this.data.updateAnnotation(newAnnotation);
    }
    this.annotations.splice(
      this.annotations.findIndex(ann => ann._id === _annotation._id),
      1,
      newAnnotation,
    );
  }

  public deleteAnnotation(_annotation: IAnnotation) {
    if (this.userdata.isAnnotationOwner(_annotation)) {
      this.setSelectedAnnotation('');
      this.setEditModeAnnotation('');
      const index: number = this.annotations.findIndex(ann => ann._id === _annotation._id);
      if (index !== -1) {
        this.annotations.splice(
          this.annotations.findIndex(ann => ann._id === _annotation._id),
          1,
        );
        this.changedRankingPositions();
        this.redrawMarker();
        if (!this.processing.fallbackEntityLoaded && !this.processing.defaultEntityLoaded) {
          this.data.deleteAnnotation(_annotation._id.toString());
          this.deleteAnnotationFromServer(_annotation._id.toString());
        }
      }
    } else {
      this.message.error('You are not the Owner of this Annotation.');
    }
  }

  public deleteAnnotationFromServer(annotationId: string) {
    const username = this.userdata.loginData.username;
    const password = this.userdata.loginData.password;

    if (username === '' || password === '') {
      this.passwordDialog(annotationId);
    } else {
      this.backend
        .deleteRequest(annotationId, 'annotation', username, password)
        .then(() => {
          this.message.info('Deleted from Server');
        })
        .catch((errorMessage: HttpErrorResponse) => {
          if (errorMessage.status === 401) {
            this.message.info('Permission denied');
            this.passwordDialog(annotationId);
          } else {
            this.message.error('Annotation can not be deleted from Server.');
          }
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
    const offset = this.processing.compilationLoaded ? this.defaultAnnotations.length : 0;
    const length = this.processing.compilationLoaded
      ? this.annotations.length
      : this.defaultAnnotations.length;
    for (let i = offset; i < length; i++) {
      const annotation = this.annotations[i];
      if (!annotation._id) continue;
      await this.updateAnnotation({ ...annotation, ranking: i - offset + 1 });
    }
  }

  private async fetchAnnotations(entity: string, compilation?: string): Promise<IAnnotation[]> {
    return new Promise<IAnnotation[]>(async (resolve, _) => {
      const annotationList: IAnnotation[] = await this.data.findAnnotations(
        entity,
        compilation ? compilation : '',
      );
      resolve(annotationList);
    });
  }

  public deleteMarker(annotationID: string) {
    const marker = this.babylon.getScene().getMeshesByTags(annotationID);
    marker.forEach(value => {
      value.dispose();
    });
  }

  public async deleteAllMarker() {
    await this.babylon
      .getScene()
      .getMeshesByTags('marker')
      .map(mesh => mesh.dispose());
  }

  public redrawMarker() {
    this.deleteAllMarker()
      .then(() => {
        for (const annotation of this.getCurrentAnnotations()) {
          this.drawMarker(annotation);
        }
      })
      .catch(e => console.error(e));
  }

  public drawMarker(newAnnotation: IAnnotation) {
    const { referencePoint, referenceNormal } = newAnnotation.target.selector;
    const positionVector = new Vector3(referencePoint.x, referencePoint.y, referencePoint.z);
    const normalVector = new Vector3(referenceNormal.x, referenceNormal.y, referenceNormal.z);

    const color = 'black';
    const scene = this.babylon.getScene();
    const id = newAnnotation._id.toString();
    const marker = createMarker(
      scene,
      1,
      newAnnotation.ranking.toString(),
      id,
      false,
      color,
      positionVector,
      normalVector,
    );
    marker.isPickable = false;

    const markertransparent = createMarker(
      scene,
      1,
      newAnnotation.ranking.toString(),
      id,
      true,
      color,
      positionVector,
      normalVector,
    );
    markertransparent.actionManager = new ActionManager(scene);
    // register 'pickCylinder' as the handler function for cylinder picking action.
    markertransparent.actionManager.registerAction(
      new ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
        this.setSelectedAnnotation(id);
      }),
    );
  }

  public setSelectedAnnotation(id: string) {
    this.selectedAnnotation.next(id);

    const selectedAnnotation = this.getCurrentAnnotations().find(
      (anno: IAnnotation) => anno._id === id,
    );
    if (selectedAnnotation) {
      const perspective = selectedAnnotation.body.content.relatedPerspective;

      if (perspective !== undefined) {
        this.babylon.cameraManager.moveActiveCameraToPosition(
          new Vector3(perspective.position.x, perspective.position.y, perspective.position.z),
        );
        this.babylon.cameraManager.setActiveCameraTarget(
          new Vector3(perspective.target.x, perspective.target.y, perspective.target.z),
        );
      }
      this.babylon.hideMesh(selectedAnnotation._id.toString(), true);
    }
  }

  public setEditModeAnnotation(id: string) {
    this.editModeAnnotation.next(id);
  }

  public async shareAnnotation(annotation: IAnnotation) {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.disableClose = true;
    dialogConfig.autoFocus = true;

    if (!this.entity) {
      throw new Error('Entity missing');
    }

    dialogConfig.data = {
      entityId: this.entity._id,
    };

    const dialogRef = this.dialog.open(DialogShareAnnotationComponent, dialogConfig);
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
            this.message.info(`Annotation is shared to Collection with id: ${data.collectionId}`);
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

    if (!this.entity) {
      throw new Error('Entity missing');
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
        name: this.userdata.userData ? this.userdata.userData.fullname : 'guest',
        _id: this.userdata.userData ? this.userdata.userData._id : 'guest',
      },
      body: annotation.body,
      target: {
        source: {
          relatedEntity: this.entity._id,
          relatedCompilation: collectionId,
        },
        selector: annotation.target.selector,
      },
    };
  }
}
