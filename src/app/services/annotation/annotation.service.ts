import { moveItemInArray } from '@angular/cdk/drag-drop';
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ActionManager, ExecuteCodeAction, PickingInfo, Tags, Vector3 } from '@babylonjs/core';
import { BehaviorSubject, ReplaySubject, combineLatest, firstValueFrom, fromEvent } from 'rxjs';
import { distinct, filter, map, switchMap } from 'rxjs/operators';
import { IAnnotation, IVector3, isAnnotation } from 'src/common';
import { annotationFallback, annotationLogo } from '../../../assets/annotations/annotations';
// tslint:disable-next-line:max-line-length
import {
  AuthConcern,
  AuthResult,
  LoginComponent,
} from 'src/app/components/dialogs/dialog-login/login.component';
import { DialogShareAnnotationComponent } from '../../components/dialogs/dialog-share-annotation/dialog-share-annotation.component';
import { BabylonService } from '../babylon/babylon.service';
import { BackendService } from '../backend/backend.service';
import { MessageService } from '../message/message.service';
import { ProcessingService } from '../processing/processing.service';
import { UserdataService } from '../userdata/userdata.service';
import { createMarker } from './visual3DElements';
import { LocalForageService } from '../localforage/localforage.service';

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
  // All about annotations
  public selectedAnnotation$ = new BehaviorSubject('');
  public editModeAnnotation$ = new BehaviorSubject('');
  public annotations$ = new BehaviorSubject<IAnnotation[]>([]);

  public isAnnotationMode$ = new BehaviorSubject(false);

  private defaultOffset = 0;

  public picked$ = new ReplaySubject<PickingInfo>();
  public debouncedPicked$ = this.isAnnotationMode$.pipe(
    filter(isAnnotationMode => isAnnotationMode),
    switchMap(() => this.picked$),
    distinct(({ pickedPoint }) => JSON.stringify(pickedPoint)),
  );

  constructor(
    private local: LocalForageService,
    private babylon: BabylonService,
    private backend: BackendService,
    private message: MessageService,
    private processing: ProcessingService,
    private dialog: MatDialog,
    private userdata: UserdataService,
  ) {
    this.debouncedPicked$.subscribe(result => {
      this.createNewAnnotation(result);
    });

    this.processing.state$.subscribe(({ entity }) => {
      if (entity) this.loadAnnotations();
    });

    this.processing.isAnnotatingFeatured$.subscribe((init: boolean) => {
      if (init) this.initializeAnnotationMode();
    });

    this.processing.hasAnnotationAllowance$.subscribe((allowance: boolean) => {
      console.log('ich setze das mesh als', allowance);
      this.setAnnotationMode(allowance);
    });

    this.defaultAnnotations$.subscribe(arr => {
      this.defaultOffset = arr.length;
    });

    this.currentAnnotations$.subscribe(() => this.redrawMarker());
  }

  get defaultAnnotations$() {
    return this.annotations$.pipe(map(arr => arr.filter(isDefaultAnnotation)));
  }

  get compilationAnnotations$() {
    return this.annotations$.pipe(map(arr => arr.filter(isCompilationAnnotation)));
  }

  get currentAnnotations$() {
    return combineLatest([this.annotations$, this.processing.compilationLoaded$]).pipe(
      map(([annotations, isCompilationLoaded]) =>
        annotations.filter(annotation =>
          isCompilationLoaded
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
    const isCompilationLoaded = await firstValueFrom(this.processing.compilationLoaded$);
    const offset = isCompilationLoaded ? this.defaultOffset : 0;
    moveItemInArray(arr, from_index + offset, to_index + offset);
    this.annotations$.next(arr);
    await this.changedRankingPositions();
  }

  public async loadAnnotations() {
    const entity = await firstValueFrom(this.processing.entity$);
    const meshes = await firstValueFrom(this.processing.meshes$);
    const isStandalone = await firstValueFrom(this.processing.isStandalone$);
    const isDefault = await firstValueFrom(this.processing.defaultEntityLoaded$);
    const isFallback = await firstValueFrom(this.processing.fallbackEntityLoaded$);
    const isAnnotatingFeatured = await firstValueFrom(this.processing.isAnnotatingFeatured$);
    if (!entity) {
      throw new Error('Entity missing');
    }
    Tags.AddTagsTo(meshes, entity._id.toString());
    this.selectedAnnotation$.next('');
    this.editModeAnnotation$.next('');
    this.annotations$.next([]);

    const loadFromServer = !isStandalone && !isDefault && !isFallback;

    if (loadFromServer) {
      // Filter null/undefined annotations
      const serverAnnotations = (await this.getAnnotationsfromServerDB()).filter(
        annotation => annotation && annotation._id && annotation.lastModificationDate,
      );
      const localAnnotations = (await this.getAnnotationsfromLocalDB()).filter(
        annotation => annotation && annotation._id && annotation.lastModificationDate,
      );
      // Update and sort local
      await this.updateLocalDB(localAnnotations, serverAnnotations);
      const updated = await this.updateAnnotationList(localAnnotations, serverAnnotations);
      this.annotations$.next(updated);

      // above updateAnnotationList call already checks if values in localAnnotations changed
      // and sends update requests to server.
      // we still need to check if the order changed for which _id comparisons are sufficient
      let unchanged =
        updated.length === serverAnnotations.length &&
        updated.every((val, index) => val._id === serverAnnotations[index]._id);
      if (!unchanged) {
        await this.sortAnnotations();
      }
    } else {
      if (isFallback) {
        this.annotations$.next([annotationFallback]);
      }
      if (isDefault) {
        if (isAnnotatingFeatured && annotationLogo.length) {
          this.annotations$.next(annotationLogo);
        }
      }
      if (isStandalone) {
        this.annotations$.next(Object.values(entity.annotations) as IAnnotation[]);
      }
      const annotations = this.annotations$.getValue();
      if (annotations.length > 0) {
        this.selectedAnnotation$.next(annotations[0]._id.toString());
      }
    }
  }

  private async getAnnotationsfromServerDB() {
    const entity = await firstValueFrom(this.processing.entity$);
    const compilation = await firstValueFrom(this.processing.compilation$);
    const isCompilationLoaded = await firstValueFrom(this.processing.compilationLoaded$);
    const serverAnnotations: IAnnotation[] = [];
    // Annotationen vom Server des aktuellen Entityls...
    for (const id in entity?.annotations) {
      const anno = entity?.annotations[id];
      if (!isAnnotation(anno)) continue;
      serverAnnotations.push(anno);
    }
    // ...und der aktuellen Compilation (if existing)
    if (entity?._id && isCompilationLoaded && compilation?.annotations) {
      const entityID = entity._id;
      for (const id in compilation?.annotations) {
        const anno = compilation?.annotations[id];
        if (!isAnnotation(anno)) continue;
        if (anno?.target?.source?.relatedEntity !== entityID) continue;
        serverAnnotations.push(anno);
      }
    }
    console.log('getAnnotationsfromServerDB', serverAnnotations);
    return serverAnnotations;
  }

  private async getAnnotationsfromLocalDB() {
    const entity = await firstValueFrom(this.processing.entity$);
    const compilation = await firstValueFrom(this.processing.compilation$);
    const isCompilationLoaded = await firstValueFrom(this.processing.compilationLoaded$);
    let localAnnotations: IAnnotation[] = entity
      ? await this.fetchAnnotations(entity._id.toString())
      : [];
    // Annotationen aus localDB des aktuellen Entityls und der aktuellen Compilation (if existing)

    if (isCompilationLoaded) {
      const _compilationAnnotations =
        entity && compilation
          ? await this.fetchAnnotations(entity._id.toString(), compilation._id.toString())
          : [];
      localAnnotations = localAnnotations.concat(_compilationAnnotations);
    }
    console.log('getAnnotationsfromLocalDB', localAnnotations);
    return localAnnotations;
  }

  private async updateLocalDB(localAnnotations: IAnnotation[], serverAnnotations: IAnnotation[]) {
    for (const annotation of serverAnnotations) {
      const localAnnotation = localAnnotations.find(
        _localAnnotation => _localAnnotation._id === annotation._id,
      );
      if (!localAnnotation) {
        await this.local.updateAnnotation(annotation);
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
    const userData = await firstValueFrom(this.userdata.userData$);
    // Durch alle Annotationen der lokalen DB
    for (const annotation of localAnnotations) {
      const isLastModifiedByMe = userData ? annotation.lastModifiedBy._id === userData._id : false;
      const isCreatedByMe = userData ? annotation.creator._id === userData._id : false;

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
          await this.local.updateAnnotation(serverAnnotation);
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
          await this.local.deleteAnnotation(annotation._id.toString());
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
    this.annotations$.next(await this.getSortedAnnotations());

    await this.changedRankingPositions();
  }

  // Die Annotationsfunktionalität wird zue aktuellen Entity hinzugefügt
  public initializeAnnotationMode() {
    fromEvent<MouseEvent>(this.babylon.getCanvas(), 'dblclick').subscribe(() => {
      const scene = this.babylon.getScene();
      const result = scene.pick(scene.pointerX, scene.pointerY, mesh => mesh.isPickable);
      if (!result?.pickedPoint) return;
      this.picked$.next(result);
    });

    this.setAnnotationMode(false);
  }

  // Das aktuelle Entityl wird anklickbar und damit annotierbar
  private async setAnnotationMode(value: boolean) {
    const mediaType = await firstValueFrom(this.processing.mediaType$);
    if (mediaType === 'video' || mediaType === 'audio') return;
    this.isAnnotationMode$.next(value);
    if (value) {
      this.babylon.getCanvas().classList.add('annotation-mode');
    } else {
      this.babylon.getCanvas().classList.remove('annotation-mode');
    }
  }

  public async createNewAnnotation(result: PickingInfo) {
    const camera = this.babylon.cameraManager.getInitialPosition();
    const currentAnnotations = await firstValueFrom(this.currentAnnotations$);
    const entity = await firstValueFrom(this.processing.entity$);
    const compilation = await firstValueFrom(this.processing.compilation$);
    const isCompilationLoaded = await firstValueFrom(this.processing.compilationLoaded$);
    const userdata = await firstValueFrom(this.userdata.userData$);

    this.babylon.createPreviewScreenshot().then(detailScreenshot => {
      if (!entity) {
        throw new Error(`this.entity not defined: ${entity}`);
      }
      const generatedId = this.backend.generateEntityId();

      const personName = userdata ? userdata.fullname : 'guest';
      const personID = userdata ? userdata._id : 'guest';

      const referencePoint = result.pickedPoint!;
      const referenceNormal = result.getNormal(true, true)!;

      const relatedCompilation =
        isCompilationLoaded && compilation ? compilation._id.toString() : '';

      const { position, target, cameraType } = camera;

      const newAnnotation: IAnnotation = {
        validated: !isCompilationLoaded,
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
          name: 'Kompakkt',
          _id: personID,
          homepage: 'https://github.com/Kompakkt/Kompakkt',
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
            relatedEntity: entity._id.toString(),
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

  private async add(_annotation: IAnnotation) {
    let newAnnotation = _annotation;
    newAnnotation.lastModificationDate = new Date().toISOString();
    const isStandalone = await firstValueFrom(this.processing.isStandalone$);
    const isDefault = await firstValueFrom(this.processing.defaultEntityLoaded$);
    const isFallback = await firstValueFrom(this.processing.fallbackEntityLoaded$);
    const updateBackend = !isStandalone && !isDefault && !isFallback;
    if (updateBackend) {
      this.backend
        .updateAnnotation(_annotation)
        .then((resultAnnotation: IAnnotation) => {
          newAnnotation = resultAnnotation;
        })
        .catch((errorMessage: any) => {
          console.log(errorMessage);
        });
      this.local.updateAnnotation(newAnnotation);
    }
    this.drawMarker(newAnnotation);
    this.annotations$.next(this.annotations$.getValue().concat(newAnnotation));
    this.selectedAnnotation$.next(newAnnotation._id.toString());
    this.editModeAnnotation$.next(newAnnotation._id.toString());
  }

  public async updateAnnotation(_annotation: IAnnotation) {
    let newAnnotation = _annotation;
    newAnnotation.lastModificationDate = new Date().toISOString();
    const isCompilationLoaded = await firstValueFrom(this.processing.compilationLoaded$);
    const compilation = await firstValueFrom(this.processing.compilation$);
    const isDefault = await firstValueFrom(this.processing.defaultEntityLoaded$);
    const isFallback = await firstValueFrom(this.processing.fallbackEntityLoaded$);
    const userOwnsCompilation = compilation && this.userdata.doesUserOwn(compilation);
    if (!isFallback && !isDefault) {
      const isOwner =
        this.userdata.isAnnotationOwner(_annotation) ||
        (isCompilationLoaded && userOwnsCompilation);
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
      this.local.updateAnnotation(newAnnotation);
    }
    const arr = this.annotations$.getValue();
    arr.splice(
      arr.findIndex(ann => ann._id === _annotation._id),
      1,
      newAnnotation,
    );
    this.annotations$.next(arr);
  }

  public async deleteAnnotation(_annotation: IAnnotation) {
    const isDefault = await firstValueFrom(this.processing.defaultEntityLoaded$);
    const isFallback = await firstValueFrom(this.processing.fallbackEntityLoaded$);
    if (this.userdata.isAnnotationOwner(_annotation)) {
      this.setSelectedAnnotation('');
      this.setEditModeAnnotation('');
      const arr = this.annotations$.getValue();
      const index = arr.findIndex(ann => ann._id === _annotation._id);
      if (index !== -1) {
        arr.splice(
          arr.findIndex(ann => ann._id === _annotation._id),
          1,
        );
        this.changedRankingPositions();
        this.redrawMarker();
        this.annotations$.next(arr);
        if (!isFallback && !isDefault) {
          this.local.deleteAnnotation(_annotation._id.toString());
          this.deleteAnnotationFromServer(_annotation._id.toString());
        }
      }
    } else {
      this.message.error('You are not the Owner of this Annotation.');
    }
  }

  public async deleteAnnotationFromServer(annotationId: string) {
    const loginData = await firstValueFrom(this.userdata.loginData$);
    if (!loginData) return this.passwordDialog(annotationId);
    const { username, password } = loginData;

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

  public async passwordDialog(annotationId: string) {
    const dialogRef = this.dialog.open<LoginComponent, AuthConcern, AuthResult>(LoginComponent, {
      width: '360px',
      disableClose: true,
      autoFocus: true,
      data: 'delete-annotation',
    });

    const authResult = await firstValueFrom(dialogRef.afterClosed());

    if (!authResult) {
      this.message.info('Annotation was not deleted.');
      return;
    }

    const deleteResult = await this.backend
      .deleteRequest(annotationId, 'annotation', authResult.username, authResult.password)
      .catch(err => {
        this.message.error('Error deleting annotation.');
        console.error(err);
        return undefined;
      });
    console.info(deleteResult);

    if (!!deleteResult) {
      this.message.info('Annotation was deleted.');
    } else {
      this.message.error('Error deleting annotation.');
    }
  }

  private async changedRankingPositions() {
    // Decide whether we iterate over the first part of this.annotations
    // containing all the default annotations or to iterate over the second part
    // containing all of the compilation annotations
    const arr = this.annotations$.getValue();
    const isCompilationLoaded = await firstValueFrom(this.processing.compilationLoaded$);
    const offset = isCompilationLoaded ? this.defaultOffset : 0;
    const length = isCompilationLoaded ? arr.length : this.defaultOffset;
    for (let i = offset; i < length; i++) {
      const annotation = arr[i];
      if (!annotation._id) continue;
      await this.updateAnnotation({ ...annotation, ranking: i - offset + 1 });
    }
  }

  private async fetchAnnotations(entity: string, compilation?: string): Promise<IAnnotation[]> {
    return new Promise<IAnnotation[]>(async (resolve, _) => {
      const annotationList: IAnnotation[] = await this.local.findAnnotations(
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

    const scene = this.babylon.getScene();
    const id = newAnnotation._id.toString();
    const marker = createMarker(scene, id, positionVector, normalVector);
    marker.isPickable = true;

    // Parent markers to center to fix offset
    const center = scene.getMeshesByTags('center')[0];
    marker.parent = center;

    marker.actionManager = new ActionManager(scene);
    // register 'pickCylinder' as the handler function for cylinder picking action.
    marker.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
        this.setSelectedAnnotation(id);
      }),
    );
  }

  public async setSelectedAnnotation(id: string) {
    const arr = await firstValueFrom(this.currentAnnotations$);
    const selectedAnnotation = arr.find(anno => anno._id === id);
    this.selectedAnnotation$.next(id);
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
    this.editModeAnnotation$.next(id);
  }

  public async shareAnnotation(annotation: IAnnotation) {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.disableClose = true;
    dialogConfig.autoFocus = true;

    const entity = await firstValueFrom(this.processing.entity$);

    if (!entity) {
      throw new Error('Entity missing');
    }

    dialogConfig.data = {
      entityId: entity._id,
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

  public async createCopyOfAnnotation(
    annotation: IAnnotation,
    collectionId: string,
    annotationLength: number,
  ) {
    const generatedId = this.backend.generateEntityId();

    const entity = await firstValueFrom(this.processing.entity$);
    const userdata = await firstValueFrom(this.userdata.userData$);

    if (!entity) {
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
        name: userdata ? userdata.fullname : 'guest',
        _id: userdata ? userdata._id : 'guest',
      },
      body: annotation.body,
      target: {
        source: {
          relatedEntity: entity._id,
          relatedCompilation: collectionId,
        },
        selector: annotation.target.selector,
      },
    };
  }
}
