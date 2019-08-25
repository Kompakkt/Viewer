import { moveItemInArray } from '@angular/cdk/drag-drop';
import { EventEmitter, Injectable, Output } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material';
import { ActionManager, Mesh, Tags } from 'babylonjs';
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
  ILDAPData,
  ISocketAnnotation,
  ISocketChangeRoom,
  ISocketMessage,
  ISocketRoomData,
  ISocketUser,
  ISocketUserInfo,
} from '../../interfaces/interfaces';
import { ActionService } from '../action/action.service';
import { AnnotationmarkerService } from '../annotationmarker/annotationmarker.service';
import { BabylonService } from '../babylon/babylon.service';
import { DataService } from '../data/data.service';
import { MessageService } from '../message/message.service';
import { MongohandlerService } from '../mongohandler/mongohandler.service';
import { OverlayService } from '../overlay/overlay.service';
import { ProcessingService } from '../processing/processing.service';
import { UserdataService } from '../userdata/userdata.service';
import { EntitySettingsService } from '../modelsettings/modelsettings.service';

@Injectable({
  providedIn: 'root',
})
export class AnnotationService {
  // What is actually going on and what is loaded? external Infos
  private actualEntity: IEntity | undefined;
  private actualEntityMeshes: Mesh[] = [];
  public actualCompilation: ICompilation | undefined;
  private isCollectionLoaded: boolean;
  private loadedMode = '';
  private mediaType = '';
  public isDefaultEntityLoaded = false;
  public isFallbackEntityLoaded = false;
  private isMeshSettingsMode = false;
  public isCollectionInputSelected = false;
  private isEntityFeaturesOpen = false;

  // All about annotations
  public isAnnotatingAllowed = false;
  @Output() annnotatingAllowed: EventEmitter<boolean> = new EventEmitter();
  private annotatableTypeAndMode = false;
  private isannotationSourceCollection = false;
  @Output() annotationSourceCollection: EventEmitter<
    boolean
  > = new EventEmitter();
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

  // User info
  private userData: ILDAPData | undefined;
  private isAuthenticated = false;
  private isEntityOwner = false;
  private isCollectionOwner = false;
  private isWhitelistMember = false;

  // Broadcasting
  public collaborators: ISocketUser[] = [];
  // TODO this array is not needed
  //  -> first users (0-maxColoredUsersMinusOne) of collab can be used
  public coloredUsers: ISocketUser[] = [];
  public color = ['pink', 'red', 'blue', 'yellow', 'purple', 'gold'];
  public maxColoredUsersMinusOne = this.color.length - 1;
  private socketRoom = '';
  public isBroadcastingAllowed = false;
  @Output() broadcastingAllowed: EventEmitter<boolean> = new EventEmitter();
  private isBroadcasting = false;
  @Output() broadcasting: EventEmitter<boolean> = new EventEmitter();

  constructor(
    private dataService: DataService,
    private actionService: ActionService,
    private annotationmarkerService: AnnotationmarkerService,
    private babylon: BabylonService,
    private mongo: MongohandlerService,
    private message: MessageService,
    public socket: Socket,
    private processingService: ProcessingService,
    private dialog: MatDialog,
    private userdataService: UserdataService,
    private overlayService: OverlayService,
    private modelSettingsService: EntitySettingsService,
  ) {
    // What is actually going on and what is loaded? external Infos
    this.processingService.Observables.actualEntity.subscribe(actualEntity => {
      this.actualEntity = actualEntity;
    });

    this.processingService.Observables.actualEntityMeshes.subscribe(
      actualEntityMeshes => {
        this.actualEntityMeshes = actualEntityMeshes;
        this.loadAnnotations();
        if (this.annotatableTypeAndMode) {
          this.initializeAnnotationMode();
          // TODO
          this.toggleAnnotationSource(false);
          this.setAnnotatingAllowance();
        }
        if (this.isBroadcasting) {
          this.changeSocketRoom();
        }
      },
    );

    this.isCollectionLoaded = this.processingService.isCollectionLoaded;
    this.processingService.Observables.actualCollection.subscribe(
      actualCompilation => {
        if (!actualCompilation) {
          this.isCollectionLoaded = false;
          return;
        }
        if (actualCompilation._id && this.actualEntity) {
          this.socketRoom = `${actualCompilation._id}_${this.actualEntity._id}`;

          actualCompilation._id
            ? (this.isCollectionLoaded = true)
            : (this.isCollectionLoaded = false);
          this.actualCompilation = actualCompilation;
        }
      },
    );

    this.processingService.Observables.actualMediaType.subscribe(type => {
      this.mediaType = type;
      const searchParams = location.search;
      const queryParams = new URLSearchParams(searchParams);
      const mode = queryParams.get('mode');
      this.loadedMode = mode ? mode : '';
      this.annotatableTypeAndMode =
        (type === 'model' || type === 'entity' || type === 'image') &&
        (mode === 'annotation' ||
          mode === 'edit' ||
          mode === 'ilias' ||
          mode === 'fullLoad');
    });

    this.processingService.defaultEntityLoaded.subscribe(isDefault => {
      this.isDefaultEntityLoaded = isDefault;
    });

    this.processingService.fallbackEntityLoaded.subscribe(isFallback => {
      this.isFallbackEntityLoaded = isFallback;
    });

    this.modelSettingsService.initialSettingsMode.subscribe(
      meshSettingsMode => {
        this.isMeshSettingsMode = meshSettingsMode;
        this.setAnnotatingAllowance();
      },
    );

    this.overlayService.editor.subscribe(open => {
      this.isEntityFeaturesOpen = open;
      this.setAnnotatingAllowance();
    });

    this.annotationmarkerService.isSelectedAnnotation.subscribe(
      selectedAnno => {
        this.selectedAnnotation.next(selectedAnno);
      },
    );
    // Userdata
    this.userdataService.userDataObservable.subscribe(data => {
      this.userData = data;
    });

    this.userdataService.isUserAuthenticatedObservable.subscribe(auth => {
      this.isAuthenticated = auth;
    });

    this.userdataService.entityOwner.subscribe(owner => {
      this.isEntityOwner = owner;
    });

    this.userdataService.collectionOwner.subscribe(owner => {
      this.isCollectionOwner = owner;
    });

    this.userdataService.whitelistMember.subscribe(member => {
      this.isWhitelistMember = member;
    });

    // Socket
    this.socket.on('message', (result: ISocketMessage) => {
      console.log(`${result.user.username}: ${result.message}`);
    });

    this.socket.on('newUser', (result: ISocketUserInfo) => {
      console.log(`GET ONLINE USERS OF YOUR ROOM - SOCKET.IO`);
      this.updateCollaboratorInfo(result);
    });

    // Our data is requested
    this.socket.on('roomDataRequest', (result: ISocketRoomData) => {
      result.info = this.getOwnSocketData();
      this.socket.emit('roomDataAnswer', result);
    });

    // We recieved data from someone
    this.socket.on('roomDataAnswer', (result: ISocketRoomData) => {
      this.updateCollaboratorInfo(result.info);
    });

    this.socket.on('createAnnotation', (result: ISocketAnnotation) => {
      console.log(
        `COLLABORATOR '${result.user.username}' CREATED AN ANNOTATION - SOCKET.IO`,
      );
      this.handleReceivedAnnotation(result.annotation);
    });

    this.socket.on('editAnnotation', (result: ISocketAnnotation) => {
      console.log(
        `COLLABORATOR '${result.user.username}' EDITED AN ANNOTATION - SOCKET.IO`,
      );
      this.handleReceivedAnnotation(result.annotation);
    });

    this.socket.on('deleteAnnotation', (result: ISocketAnnotation) => {
      // [socket.id, annotation]
      console.log(
        `COLLABORATOR '${result.user.username}' DELETED AN ANNOTATION- SOCKET.IO`,
      );
      this.deleteRequestAnnotation(result.annotation);
    });

    // TODO
    this.socket.on('changeRanking', result => {
      //  [socket.id, IdArray, RankingArray]
      console.log(
        `COLLABORATOR '${result[0]}' CHANGED ANNOTATION-RANKING - SOCKET.IO`,
      );
    });

    // A user lost connection, so we remove knowledge about this user
    this.socket.on('lostConnection', (result: ISocketUserInfo) => {
      // [user, annotations]);
      console.log(
        `COLLABORATOR '${result.user.username}' LOGGED OUT - SOCKET.IO`,
      );
      this.removeKnowledgeAboutUser(result);
    });

    this.socket.on('logout', _ => {
      // socket.id
      console.log(`logging out of Socket.io...`);
    });

    // A user left the room, so we remove knowledge about this user
    this.socket.on('changeRoom', (result: ISocketUserInfo) => {
      console.log(
        `COLLABORATOR '${result.user.username}' CHANGED ROOM - SOCKET.IO`,
      );
      this.removeKnowledgeAboutUser(result);
    });

    // Lost connection to server
    this.socket.on('disconnect', () => {
      this.isBroadcasting = false;
      this.broadcasting.emit(false);
      this.collaborators = [];
      this.sortUser();
      // this.collaboratorsAnnotations = [];
      this.socket.disconnect();
    });
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
    const next = this.isannotationSourceCollection
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
    return this.isannotationSourceCollection
      ? this.getCompilationAnnotations()
      : this.getDefaultAnnotations();
  }

  public async moveAnnotationByIndex(from_index: number, to_index: number) {
    await this.sortAnnotations();
    // Since all annotations are in the same array but sorted
    // with defaults first and compilation following
    // we can calculate the offset if needed
    const offset = this.isannotationSourceCollection
      ? this.getDefaultAnnotations().length
      : 0;
    moveItemInArray(this.annotations, from_index + offset, to_index + offset);
    await this.changedRankingPositions();
  }

  public async loadAnnotations() {
    if (!this.actualEntity) {
      throw new Error('ActualEntity missing');
      console.error(this);
      return;
    }
    Tags.AddTagsTo(this.actualEntityMeshes, this.actualEntity._id);
    this.selectedAnnotation.next('');
    this.editModeAnnotation.next('');
    await this.annotationmarkerService.deleteAllMarker();
    this.annotations.splice(0, this.annotations.length);

    if (!this.isDefaultEntityLoaded && !this.isFallbackEntityLoaded) {
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
      if (this.processingService.isFallbackEntityLoaded) {
        this.annotations.push(annotationFallback);
      }
      if (this.isDefaultEntityLoaded) {
        const annotationMode = this.loadedMode === 'annotation';
        if (annotationMode && annotationLogo.length) {
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
      this.isCollectionLoaded &&
      this.actualCompilation &&
      this.actualCompilation.annotationList
    ) {
      (this.actualCompilation.annotationList.filter(
        annotation => annotation && annotation._id,
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

    if (this.isCollectionLoaded) {
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
      const isLastModifiedByMe = this.userData
        ? annotation.lastModifiedBy._id === this.userData._id
        : false;
      const isCreatedByMe = this.userData
        ? annotation.creator._id === this.userData._id
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
            this.mongo.updateAnnotation(annotation);
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
          this.mongo.updateAnnotation(annotation);
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

  // For Broadcasting
  public handleReceivedAnnotation(newAnnotation: IAnnotation) {
    const foundIndex = this.annotations.findIndex(
      annotation => newAnnotation._id === annotation._id,
    );
    if (foundIndex === -1) {
      this.annotations.push(newAnnotation);
    } else {
      this.annotations.splice(foundIndex, 1, newAnnotation);
    }
  }

  public deleteRequestAnnotation(newAnnotation: IAnnotation) {
    const foundIndex = this.annotations.findIndex(
      annotation => newAnnotation._id === annotation._id,
    );
    if (foundIndex !== -1) {
      this.annotations.splice(foundIndex, 1);
    }
  }

  // Die Annotationsfunktionalität wird zum aktuellen Entityl hinzugefügt
  public initializeAnnotationMode() {
    this.actualEntityMeshes.forEach(mesh => {
      console.log('mesh: ', mesh);
      this.actionService.createActionManager(
        mesh,
        ActionManager.OnDoublePickTrigger,
        this.createNewAnnotation.bind(this),
      );
    });
    this.annotationMode(false);
  }

  public async createNewAnnotation(result: any) {
    const camera = this.babylon.cameraManager.getInitialPosition();

    this.babylon.createPreviewScreenshot(400).then(detailScreenshot => {
      if (!this.actualEntity) {
        throw new Error(`this.actualEntity not defined: ${this.actualEntity}`);
        console.error('AnnotationService:', this);
        return;
      }
      const generatedId = this.mongo.generateEntityId();

      const personName = this.userData ? this.userData.fullname : 'guest';
      const personID = this.userData ? this.userData._id : 'guest';

      const newAnnotation: IAnnotation = {
        validated: !this.isCollectionLoaded,
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
              this.isCollectionLoaded && this.actualCompilation
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
      console.log(newAnnotation);
      this.add(newAnnotation);
    });
  }

  private add(_annotation: IAnnotation): void {
    let newAnnotation = _annotation;
    newAnnotation.lastModificationDate = new Date().toISOString();
    if (!this.isDefaultEntityLoaded && !this.isFallbackEntityLoaded) {
      if (this.isBroadcasting) {
        this.socket.emit('createAnnotation', {
          annotation: _annotation,
          user: this.getOwnSocketData().user,
        });
      }
      this.mongo
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
    if (!this.isFallbackEntityLoaded && !this.isDefaultEntityLoaded) {
      if (
        this.userdataService.isAnnotationOwner(_annotation) ||
        (this.isCollectionLoaded && this.userdataService.isCollectionOwner)
      ) {
        if (this.isBroadcasting) {
          this.socket.emit('editAnnotation', {
            annotation: _annotation,
            user: this.getOwnSocketData().user,
          });
        }
        this.mongo
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
        if (this.isBroadcasting) {
          this.socket.emit('deleteAnnotation', {
            annotation: _annotation,
            user: this.getOwnSocketData().user,
          });
        }
        this.changedRankingPositions();
        this.redrawMarker();
        if (!this.isFallbackEntityLoaded && !this.isDefaultEntityLoaded) {
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
      this.mongo
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
    const offset = this.isannotationSourceCollection
      ? this.getDefaultAnnotations().length
      : 0;
    const length = this.isannotationSourceCollection
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
    if (!this.isBroadcasting) {
      const color = 'black';
      this.annotationmarkerService.createAnnotationMarker(newAnnotation, color);
    } else {
      let color = 'black';
      if (this.coloredUsers.length) {
        const cUserIndex = this.coloredUsers.findIndex(
          x => x._id === newAnnotation.creator._id,
        );
        if (cUserIndex !== -1 && cUserIndex < this.maxColoredUsersMinusOne) {
          color = this.color[cUserIndex];
        }
      }
      this.annotationmarkerService.createAnnotationMarker(newAnnotation, color);
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

    if (!this.actualEntity) {
      throw new Error('ActualEntity missing');
      console.error(this);
      return;
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

        this.mongo
          .updateAnnotation(copyAnnotation)
          .then(result => {
            if (result.status === 'ok') {
              this.message.info(
                `Annotation is shared to Collection with id: ${data.collectionId}`,
              );
            } else {
              console.log('Status:', result);
            }
          })
          .catch(() => this.message.error('Annotation can not be shared.'));
      });
  }

  public createCopyOfAnnotation(
    annotation: IAnnotation,
    collectionId: string,
    annotationLength: number,
  ): any {
    const generatedId = this.mongo.generateEntityId();

    if (!this.actualEntity) {
      throw new Error('ActualEntity missing');
      console.error(this);
      return;
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
        name: this.userData ? this.userData.fullname : 'guest',
        _id: this.userData ? this.userData._id : 'guest',
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

  public setAnnotatingAllowance() {
    let emitBool = false;
    if (!this.annotatableTypeAndMode) {
      this.isAnnotatingAllowed = false;
      this.annnotatingAllowed.emit(false);
      return;
    }
    emitBool =
      this.isEntityFeaturesOpen &&
      (!this.isMeshSettingsMode
        ? true
        : this.isDefaultEntityLoaded || this.isFallbackEntityLoaded);
    if (emitBool && !this.isCollectionInputSelected) {
      emitBool =
        (this.isAuthenticated &&
          this.isEntityOwner &&
          !this.isCollectionLoaded) ||
        this.isDefaultEntityLoaded;
    }
    if (emitBool && this.isCollectionLoaded) {
      emitBool =
        this.actualCompilation && this.isAuthenticated
          ? !this.actualCompilation.whitelist.enabled ||
            this.isCollectionOwner ||
            this.isWhitelistMember
          : false;
    }
    this.isAnnotatingAllowed = emitBool;
    this.annotationMode(emitBool);
    this.annnotatingAllowed.emit(emitBool);
    console.log('set allowance: ', emitBool);
    this.setBroadcastingAllowance();
  }

  public setCollectionInput(selected: boolean) {
    this.isCollectionInputSelected = selected;
    this.toggleAnnotationSource(selected);
    this.setAnnotatingAllowance();
  }

  // Das aktuelle Entityl wird anklickbar und damit annotierbar
  public annotationMode(value: boolean) {
    if (this.mediaType === 'video' || this.mediaType === 'audio') {
      return;
    }
    this.actualEntityMeshes.forEach(mesh => {
      this.actionService.pickableEntity(mesh, value);
    });
  }

  private setBroadcastingAllowance() {
    // annotating allowed && collection loaded && (!whitelist ||
    // whitlist users > 0 also mehr Personen als Owner && mode !== edit
    const mode = this.loadedMode === 'edit';
    const isBroadcastingInput =
      this.mediaType !== 'audio' && this.mediaType !== 'video';
    let allowance = false;
    if (
      !this.isAuthenticated ||
      !this.isAnnotatingAllowed ||
      !isBroadcastingInput ||
      mode ||
      !this.isCollectionLoaded
    ) {
      allowance = false;
    } else {
      if (
        (this.actualCompilation && !this.actualCompilation.whitelist.enabled) ||
        (this.actualCompilation &&
          this.actualCompilation.whitelist.groups.length > 0) ||
        (this.actualCompilation &&
          this.actualCompilation.whitelist.persons.length > 0)
      ) {
        allowance = true;
      }
    }

    this.isBroadcastingAllowed = allowance;
    this.broadcastingAllowed.emit(allowance);
  }

  public toggleAnnotationSource(sourceCol: boolean) {
    if (sourceCol !== this.isannotationSourceCollection) {
      this.isannotationSourceCollection = sourceCol;
      this.updateCurrentAnnotationsSubject();
    }
  }

  // Broadcasting
  // -- Basic functionality

  // TODO
  private getOwnSocketData(): ISocketUserInfo {
    return {
      user: {
        _id: this.userData ? this.userData._id : '',
        fullname: this.userData ? this.userData.fullname : '',
        username: this.userData ? this.userData.username : '',
        room: this.socketRoom,
        socketId: 'self',
      },
      annotations: this.getCompilationAnnotations(),
    };
  }

  public loginToSocket() {
    this.isBroadcasting = true;
    this.broadcasting.emit(true);
    this.socket.connect();
    console.log(`LOGGING IN TO SOCKET.IO \n ROOM: '${this.socketRoom}'`);
    // emit "you" as newUser to other online members of your current room
    const emitData: ISocketUserInfo = this.getOwnSocketData();
    this.socket.emit('newUser', emitData);
    // Request Roomdata from every person in the room
    const emitRequest: ISocketRoomData = {
      info: emitData,
      requester: emitData,
      recipient: this.socketRoom,
    };
    this.socket.emit('roomDataRequest', emitRequest);
    this.redrawMarker();
  }

  public disconnectSocket() {
    this.isBroadcasting = false;
    this.broadcasting.emit(false);
    this.collaborators = [];
    this.sortUser();
    // send info to other Room members,
    // then emit 'logout' from Socket.id for this User
    // TODO sollen die Annotationen "mitgenommen" werden?
    this.socket.emit('logout', { annotations: [] });
    this.socket.disconnect();
    this.redrawMarker();
  }

  public changeSocketRoom() {
    this.collaborators = [];
    this.sortUser();
    // TODO sollen die Annotationen "mitgenommen" werden?
    // this.collaboratorsAnnotations = [];
    const emitData: ISocketChangeRoom = {
      newRoom: this.socketRoom,
      annotations: [],
    };
    this.socket.emit('changeRoom', emitData);
  }

  private updateCollaboratorInfo(data: ISocketUserInfo) {
    if (
      !this.collaborators.find(_user => data.user.socketId === _user.socketId)
    ) {
      this.collaborators.push(data.user);
      this.sortUser();

      data.annotations.forEach(annotation => {
        console.log('Bekomme in Socket von Collab: ', annotation);
        this.handleReceivedAnnotation(annotation);
      });
    }
  }

  private removeKnowledgeAboutUser(userInfo: ISocketUserInfo) {
    this.collaborators = this.collaborators.filter(
      _user => _user._id !== userInfo.user._id,
    );
    this.sortUser();
  }

  // -- colored Users and colored Annotations and colored Marker

  public sortUser(priorityUser?: ISocketUser) {
    const selfIndex = this.collaborators.findIndex(
      user => user.socketId === this.socket.ioSocket.id,
    );

    const self = this.collaborators.splice(selfIndex, 1)[0];
    if (!self) {
      throw new Error('Sortuser Self missing');
      console.error(this);
      return;
    }

    if (priorityUser) {
      const pUserIndex = this.collaborators.findIndex(
        x => x.socketId === priorityUser.socketId,
      );
      const pUser =
        pUserIndex !== -1
          ? this.collaborators.splice(pUserIndex, 1)[0]
          : priorityUser;
      this.collaborators.unshift(pUser);
    }

    this.collaborators.unshift(self);

    this.coloredUsers = this.collaborators;

    this.redrawMarker();
  }

  public getColor(annotationCreatorId: string): string {
    if (this.isBroadcasting) {
      if (this.coloredUsers.length) {
        const cUserIndex = this.coloredUsers.findIndex(
          x => x._id === annotationCreatorId,
        );
        if (cUserIndex !== -1 && cUserIndex < this.maxColoredUsersMinusOne) {
          return this.color[cUserIndex];
        }
        return '$cardbgr';
      }
      return '$cardbgr';
    }
    return '$cardbgr';
  }
}
