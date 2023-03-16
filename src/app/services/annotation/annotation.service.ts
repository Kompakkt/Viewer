import { moveItemInArray } from '@angular/cdk/drag-drop';
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { IAnnotation, ICompilation, IEntity, IVector3, isAnnotation } from 'src/common';
import {
  ActionManager,
  ExecuteCodeAction,
  Mesh,
  Tags,
  Vector3,
  PickingInfo,
} from '@babylonjs/core';
import { map } from 'rxjs/operators';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

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

const isDefaultAnnotation = (annotation: IAnnotation) =>
  !annotation.target.source.relatedCompilation ||
  annotation.target.source.relatedCompilation === '';

const isCompilationAnnotation = (annotation: IAnnotation) =>
  annotation.target.source.relatedCompilation !== undefined &&
  annotation.target.source.relatedCompilation.length > 0;

const sortByRanking = (a: IAnnotation, b: IAnnotation): number =>
  +a.ranking === +b.ranking ? 0 : +a.ranking < +b.ranking ? -1 : 1;

interface IAmbiguousVector extends IVector3 {
  _x?: number;
  _y?: number;
  _z?: number;
}

const getVector = ({ x, y, z, _x, _y, _z }: IAmbiguousVector) =>
  _x && _y && _z ? new Vector3(_x, _y, _z) : new Vector3(x, y, z);

@Injectable({
  providedIn: 'root',
})
export class AnnotationService {
  // What is actually going on and what is loaded? external Infos
  private entity: IEntity | undefined;
  private meshes: Mesh[] = [];
  public compilation: ICompilation | undefined;
  private isStandalone = false;

  // All about annotations
  private selectedAnnotation = new BehaviorSubject('');
  public isSelectedAnnotation = this.selectedAnnotation.asObservable();
  private editModeAnnotation = new BehaviorSubject('');
  public isEditModeAnnotation = this.editModeAnnotation.asObservable();
  private annotations = new BehaviorSubject<IAnnotation[]>([]);
  public annotations$ = this.annotations.asObservable();

  public isAnnotationMode$ = new BehaviorSubject(false);

  private defaultOffset = 0;

  constructor(
    private data: DataService,
    private babylon: BabylonService,
    private backend: BackendService,
    private message: MessageService,
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

    this.processing.isStandalone$.subscribe(isStandalone => {
      this.isStandalone = isStandalone;
    });

    this.processing.loadAnnotations.subscribe((load: boolean) => {
      if (load) this.loadAnnotations();
    });

    this.processing.initialiseEntityForAnnotating.subscribe((init: boolean) => {
      if (init) this.initializeAnnotationMode();
    });

    this.processing.setAnnotationAllowance.subscribe((allowance: boolean) => {
      console.log('ich setze das mesh als', allowance);
      this.setAnnotationMode(allowance);
    });

    this.defaultAnnotations$.subscribe(arr => {
      this.defaultOffset = arr.length;
    });

    this.currentAnnotations$.subscribe(() => this.redrawMarker());
  }

  get isHomepageEntity() {
    return this.entity?._id === 'default' && !this.processing.mode;
  }

  get defaultAnnotations$() {
    return this.annotations$.pipe(map(arr => arr.filter(isDefaultAnnotation)));
  }

  get compilationAnnotations$() {
    return this.annotations$.pipe(map(arr => arr.filter(isCompilationAnnotation)));
  }

  get currentAnnotations$() {
    return this.annotations$.pipe(
      map(arr =>
        arr.filter(annotation =>
          this.processing.compilationLoaded
            ? isCompilationAnnotation(annotation)
            : isDefaultAnnotation(annotation),
        ),
      ),
    );
  }

  public async moveAnnotationByIndex(from_index: number, to_index: number) {
    // Since all annotations are in the same array but sorted
    // with defaults first and compilation following
    // we can calculate the offset if needed
    const arr = await this.getSortedAnnotations();
    const offset = this.processing.compilationLoaded ? this.defaultOffset : 0;
    moveItemInArray(arr, from_index + offset, to_index + offset);
    this.annotations.next(arr);
    await this.changedRankingPositions();
  }

  public async loadAnnotations() {
    if (!this.entity) {
      throw new Error('Entity missing');
    }
    Tags.AddTagsTo(this.meshes, this.entity._id.toString());
    this.selectedAnnotation.next('');
    this.editModeAnnotation.next('');
    this.annotations.next([]);

    const loadFromServer =
      !this.isStandalone &&
      !this.processing.defaultEntityLoaded &&
      !this.processing.fallbackEntityLoaded;

    if (loadFromServer) {
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
      this.annotations.next(updated);

      // above updateAnnotationList call already checks if values in pouchAnnotations changed
      // and sends update requests to server.
      // we still need to check if the order changed for which _id comparisons are sufficient
      let unchanged =
        updated.length === serverAnnotations.length &&
        updated.every((val, index) => val._id === serverAnnotations[index]._id);
      if (!unchanged) {
        await this.sortAnnotations();
      }
    } else {
      if (this.processing.fallbackEntityLoaded) {
        this.annotations.next([annotationFallback]);
      }
      if (this.processing.defaultEntityLoaded) {
        if (this.processing.annotatingFeatured && annotationLogo.length) {
          this.annotations.next(annotationLogo);
        }
      }
      if (this.isStandalone) {
        this.annotations.next(Object.values(this.entity.annotations) as IAnnotation[]);
      }
      const annotations = await firstValueFrom(this.annotations);
      if (annotations.length > 0) {
        this.selectedAnnotation.next(annotations[0]._id.toString());
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

  private async getSortedAnnotations() {
    const defaultAnnotations = (await firstValueFrom(this.defaultAnnotations$)).sort(sortByRanking);
    const compilationAnnotations = (await firstValueFrom(this.compilationAnnotations$)).sort(
      sortByRanking,
    );

    return defaultAnnotations.concat(compilationAnnotations);
  }

  private async sortAnnotations() {
    this.annotations.next(await this.getSortedAnnotations());

    await this.changedRankingPositions();
  }

  // Die Annotationsfunktionalität wird zue aktuellen Entity hinzugefügt
  public initializeAnnotationMode() {
    this.babylon.getCanvas().addEventListener('dblclick', () => {
      const scene = this.babylon.getScene();
      const result = scene.pick(scene.pointerX, scene.pointerY, mesh => mesh.isPickable);
      if (!result) return;
      console.log('Picked', result);
      this.createNewAnnotation(result);
    });
    this.setAnnotationMode(false);
  }

  // Das aktuelle Entityl wird anklickbar und damit annotierbar
  private setAnnotationMode(value: boolean) {
    if (
      this.processing.entityMediaType === 'video' ||
      this.processing.entityMediaType === 'audio'
    ) {
      return;
    }
    this.isAnnotationMode$.next(value);
    if (value) {
      this.babylon.getCanvas().classList.add('annotation-mode');
    } else {
      this.babylon.getCanvas().classList.remove('annotation-mode');
    }
    for (const mesh of this.meshes) {
      if (mesh.name === '__root__') continue; // Skip GlTF root node
      console.log('Mesh', mesh);
      mesh.isPickable = value;
    }
  }

  public async createNewAnnotation(result: PickingInfo) {
    const camera = this.babylon.cameraManager.getInitialPosition();
    const currentAnnotations = await firstValueFrom(this.currentAnnotations$);

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

      const referencePoint = result.pickedPoint!;
      const referenceNormal = result.getNormal(true, true)!;

      const relatedCompilation =
        this.processing.compilationLoaded && this.compilation
          ? this.compilation._id.toString()
          : '';

      const { position, target, cameraType } = camera;

      const newAnnotation: IAnnotation = {
        validated: !this.processing.compilationLoaded,
        _id: generatedId,
        identifier: generatedId,
        ranking: currentAnnotations.length + 1,
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
              cameraType,
              position,
              target,
              preview: detailScreenshot,
            },
          },
        },
        target: {
          source: {
            relatedEntity: this.entity._id.toString(),
            relatedCompilation,
          },
          selector: {
            referencePoint,
            referenceNormal,
          },
        },
      };
      this.add(newAnnotation);
    });
  }

  private add(_annotation: IAnnotation): void {
    let newAnnotation = _annotation;
    newAnnotation.lastModificationDate = new Date().toISOString();
    const updateBackend =
      !this.isStandalone &&
      !this.processing.defaultEntityLoaded &&
      !this.processing.fallbackEntityLoaded;
    if (updateBackend) {
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
    this.annotations.next(this.annotations.getValue().concat(newAnnotation));
    this.selectedAnnotation.next(newAnnotation._id.toString());
    this.editModeAnnotation.next(newAnnotation._id.toString());
  }

  public updateAnnotation(_annotation: IAnnotation) {
    let newAnnotation = _annotation;
    newAnnotation.lastModificationDate = new Date().toISOString();
    if (!this.processing.fallbackEntityLoaded && !this.processing.defaultEntityLoaded) {
      const isOwner =
        this.userdata.isAnnotationOwner(_annotation) ||
        (this.processing.compilationLoaded && this.userdata.userOwnsCompilation);
      if (isOwner) {
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
    const arr = this.annotations.getValue();
    arr.splice(
      arr.findIndex(ann => ann._id === _annotation._id),
      1,
      newAnnotation,
    );
    this.annotations.next(arr);
  }

  public deleteAnnotation(_annotation: IAnnotation) {
    if (this.userdata.isAnnotationOwner(_annotation)) {
      this.setSelectedAnnotation('');
      this.setEditModeAnnotation('');
      const arr = this.annotations.getValue();
      const index = arr.findIndex(ann => ann._id === _annotation._id);
      if (index !== -1) {
        arr.splice(
          arr.findIndex(ann => ann._id === _annotation._id),
          1,
        );
        this.changedRankingPositions();
        this.redrawMarker();
        this.annotations.next(arr);
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
    const arr = this.annotations.getValue();
    const offset = this.processing.compilationLoaded ? this.defaultOffset : 0;
    const length = this.processing.compilationLoaded ? arr.length : this.defaultOffset;
    for (let i = offset; i < length; i++) {
      const annotation = arr[i];
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
    this.babylon
      .getScene()
      .getMeshesByTags(annotationID)
      .forEach(value => value.dispose());
  }

  public async redrawMarker() {
    const arr = await firstValueFrom(this.currentAnnotations$);
    for (const annotation of arr) {
      this.deleteMarker(annotation._id.toString());
      this.drawMarker(annotation);
    }
  }

  public drawMarker(newAnnotation: IAnnotation) {
    const { referencePoint, referenceNormal } = newAnnotation.target.selector;
    const positionVector = getVector(referencePoint);
    const normalVector = getVector(referenceNormal);

    const color = 'black';
    const scene = this.babylon.getScene();
    const id = newAnnotation._id.toString();
    const marker = createMarker(
      scene,
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
      new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
        this.setSelectedAnnotation(id);
      }),
    );
  }

  public async setSelectedAnnotation(id: string) {
    const arr = await firstValueFrom(this.currentAnnotations$);
    const selectedAnnotation = arr.find(anno => anno._id === id);
    this.selectedAnnotation.next(id);
    if (!selectedAnnotation) return;

    const perspective = selectedAnnotation.body.content.relatedPerspective;
    if (perspective !== undefined) {
      this.babylon.cameraManager.setCameraType('ArcRotateCamera');
      this.babylon.cameraManager.moveActiveCameraToPosition(
        new Vector3(perspective.position.x, perspective.position.y, perspective.position.z),
      );
      this.babylon.cameraManager.setActiveCameraTarget(
        new Vector3(perspective.target.x, perspective.target.y, perspective.target.z),
      );
    }
    this.babylon.hideMesh(selectedAnnotation._id.toString(), true);
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
