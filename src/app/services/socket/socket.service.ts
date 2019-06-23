import {EventEmitter, Injectable, Output} from '@angular/core';
import {Socket} from 'ngx-socket-io';

import {
  IAnnotation,
  ISocketAnnotation,
  ISocketChangeRoom,
  ISocketMessage,
  ISocketRoomData,
  ISocketUser,
  ISocketUserInfo,
} from '../../interfaces/interfaces';
import {AnnotationService} from '../annotation/annotation.service';
import {AnnotationmarkerService} from '../annotationmarker/annotationmarker.service';
import {ProcessingService} from '../processing/processing.service';
import {UserdataService} from '../userdata/userdata.service';

@Injectable({
  providedIn: 'root',
})
export class SocketService {

  public collaborators: ISocketUser[] = [];
  // TODO this array is not needed -> first users (0-maxColoredUsersMinusOne) of collab can be used
  public coloredUsers: ISocketUser[] = [];
  public color = ['pink', 'red', 'blue', 'yellow', 'purple', 'gold'];
  public maxColoredUsersMinusOne = this.color.length - 1;

  public socketRoom: string;

  public isInSocket = false;
  @Output() inSocket: EventEmitter<boolean> = new EventEmitter();

  public isBroadcastingAllowed = false;
  @Output() broadcastingAllowed: EventEmitter<boolean> = new EventEmitter();

  private isDefaultModelLoaded: boolean;

  private knownAnnotations: IAnnotation[] = [];

  constructor(public socket: Socket,
              private processingService: ProcessingService,
              private userdataService: UserdataService,
              private annotationmarkerService: AnnotationmarkerService,
              private annotationService: AnnotationService) {

    this.isInSocket = false;
    this.inSocket.emit(false);
    this.annotationService.isBroadcasting = false;
    this.isDefaultModelLoaded = this.processingService.isDefaultModelLoaded;

    this.processingService.Observables.actualModel.subscribe(_ => {
      const currentCompilation = this.processingService.getCurrentCompilation();
      const currentModel = this.processingService.getCurrentModel();

      // We always need a model loaded
      if (!currentModel) return;

      this.socketRoom = (currentCompilation)
        ? `${currentCompilation._id}_${currentModel._id}` : `${currentModel._id}`;

      if (this.inSocket) {
        this.changeSocketRoom();
      }
    });

    this.annotationService.annnotatingAllowed.subscribe(allowed => {
      if (!allowed && this.isDefaultModelLoaded) {
        this.isBroadcastingAllowed = true;
        this.broadcastingAllowed.emit(true);
      } else {
        this.isBroadcastingAllowed = allowed;
        this.broadcastingAllowed.emit(allowed);
      }
    });

    this.processingService.defaultModelLoaded.subscribe(loaded => {
      this.isDefaultModelLoaded = loaded;
    });

    this.knownAnnotations = [];

    this.annotationService.currentAnnotations.subscribe(newList => {
      const prevLength = this.knownAnnotations.length;
      const newLength = newList.length;

      // Beim Start der Anwendung, noch bevor man mit Socket verbunden ist
      // sollte dieses Array dem aus dem AnnotationService entsprechen
      if (this.knownAnnotations.length === 0) {
        this.knownAnnotations = newList;
        return;
      }

      if (prevLength < newLength) {
        // Annotation hinzugefügt, also suche in neuen Annotationen
        // nach unbekannter Annotation
        const newAnnotation = newList
          .find(annotation => !this.knownAnnotations.includes(annotation));
        if (!newAnnotation) return;
        this.knownAnnotations.push(newAnnotation);
        if (this.inSocket && newAnnotation.creator._id === this.getOwnSocketData().user._id) {
          socket.emit('createAnnotation', {
            annotation: newAnnotation, user: this.getOwnSocketData().user,
          });
          this.drawMarker(newAnnotation);
        }
      } else if (prevLength > newLength) {
        // Annotation entfernt, also suche in bekannten Annotationen
        // nach fehlender Annotation
        const indexOfRemovedAnnotation = this.knownAnnotations
          .findIndex(annotation => !newList.includes(annotation));
        const removedAnnotation = this.knownAnnotations
          .find(annotation => !newList.includes(annotation));
        if (!removedAnnotation) return;
        this.knownAnnotations.splice(indexOfRemovedAnnotation, 1);
        if (this.inSocket && removedAnnotation.creator._id === this.getOwnSocketData().user._id) {
          socket.emit('deleteAnnotation', {
            annotation: removedAnnotation, user: this.getOwnSocketData().user,
          });
          this.redrawMarker();
        }
      } else {
        // Annotation geändert, also suche in neuen Annotationen
        // nach unbekannter Annotation und ersetze diese in Bekannten
        const changedAnnotation = newList
          .find(annotation => !this.knownAnnotations.includes(annotation));
        if (!changedAnnotation || !changedAnnotation._id) return;
        const indexOfChanged = this.knownAnnotations
          .findIndex(annotation => annotation._id === changedAnnotation._id);
        this.knownAnnotations.splice(indexOfChanged, 1, changedAnnotation);
        if (this.inSocket && changedAnnotation.lastModifiedBy._id === this.getOwnSocketData().user._id) {
          socket.emit('editAnnotation', {
            annotation: changedAnnotation, user: this.getOwnSocketData().user,
          });
        }
      }
    });

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
      console.log(`COLLABORATOR '${result.user.username}' CREATED AN ANNOTATION - SOCKET.IO`);
      if (result.user._id !== this.getOwnSocketData().user._id) {
        this.annotationService.handleReceivedAnnotation(result.annotation);
      }
    });

    this.socket.on('editAnnotation', (result: ISocketAnnotation) => {
      console.log(`COLLABORATOR '${result.user.username}' EDITED AN ANNOTATION - SOCKET.IO`);
      if (result.user._id !== this.getOwnSocketData().user._id) {
        this.annotationService.handleReceivedAnnotation(result.annotation);
      }
    });

    this.socket.on('deleteAnnotation', (result: ISocketAnnotation) => { // [socket.id, annotation]
      console.log(`COLLABORATOR '${result.user.username}' DELETED AN ANNOTATION- SOCKET.IO`);
      if (result.user._id !== this.getOwnSocketData().user._id) {
        this.annotationService.deleteRequestAnnotation(result.annotation);
      }
    });

    // TODO
    this.socket.on('changeRanking', result => {  //  [socket.id, IdArray, RankingArray]
      console.log(`COLLABORATOR '${result[0]}' CHANGED ANNOTATION-RANKING - SOCKET.IO`);
    });

    // A user lost connection, so we remove knowledge about this user
    this.socket.on('lostConnection', (result: ISocketUserInfo) => { // [user, annotations]);
      console.log(`COLLABORATOR '${result.user.username}' LOGGED OUT - SOCKET.IO`);
      this.removeKnowledgeAboutUser(result);
    });

    this.socket.on('logout', _ => { // socket.id
      console.log(`logging out of Socket.io...`);
    });

    // A user left the room, so we remove knowledge about this user
    this.socket.on('changeRoom', (result: ISocketUserInfo) => {
      console.log(`COLLABORATOR '${result.user.username}' CHANGED ROOM - SOCKET.IO`);
      this.removeKnowledgeAboutUser(result);
    });

    // Lost connection to server
    this.socket.on('disconnect', () => {
      this.isInSocket = false;
      this.inSocket.emit(false);
      this.annotationService.isBroadcasting = false;
      this.collaborators = [];
      this.sortUser();
      // this.collaboratorsAnnotations = [];
      this.socket.disconnect();
    });
  }

  // -- Basic functionality

  private getOwnSocketData(): ISocketUserInfo {
    const userData = this.userdataService.getUserDataForSocket();
    return {
      user: {
        _id: userData._id,
        fullname: userData.fullname,
        username: userData.username,
        room: this.socketRoom,
        socketId: 'self',
      },
      annotations: this.knownAnnotations,
    };
  }

  public loginToSocket() {
    this.isInSocket = true;
    this.inSocket.emit(true);
    this.annotationService.isBroadcasting = true;
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
    this.isInSocket = false;
    this.inSocket.emit(false);
    this.annotationService.isBroadcasting = false;
    this.collaborators = [];
    this.sortUser();
    // send info to other Room members,
    // then emit 'logout' from Socket.id for this User
    // TODO sollen die Annotationen "mitgenommen" werden?
    this.socket.emit('logout', {annotations: []});
    this.socket.disconnect();
    this.annotationService.redrawMarker();
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
    if (!this.collaborators.find(_user => data.user.socketId === _user.socketId)) {
      this.collaborators.push(data.user);
      this.sortUser();

      data.annotations.forEach(annotation => {
        console.log('Bekomme in Socket von Collab: ', annotation);
        this.annotationService.handleReceivedAnnotation(annotation);
      });
    }
  }

  private removeKnowledgeAboutUser(userInfo: ISocketUserInfo) {
    this.collaborators = this.collaborators.filter(_user => _user._id !== userInfo.user._id);
    this.sortUser();
  }

  // -- colored Users and colored Annotations and colored Marker

  public sortUser(priorityUser?: ISocketUser) {
    const selfIndex = this.collaborators
      .findIndex(user => user.socketId === this.socket.ioSocket.id);

    const self = this.collaborators.splice(selfIndex, 1)[0];
    if (!self) return;

    if (priorityUser) {
      const pUserIndex = this.collaborators.findIndex(x => x.socketId === priorityUser.socketId);
      const pUser = (pUserIndex !== -1)
        ? this.collaborators.splice(pUserIndex, 1)[0] : priorityUser;
      this.collaborators.unshift(pUser);
    }

    this.collaborators.unshift(self);

    this.coloredUsers = this.collaborators;

    this.redrawMarker();
  }

  public redrawMarker() {
    this.annotationmarkerService.deleteAllMarker()
      .then(() => {
        for (const annotation of this.knownAnnotations) {
          let color = 'black';
          if (this.coloredUsers.length) {
            for (let i = 0; i < this.maxColoredUsersMinusOne; i++) {
              if (!this.coloredUsers[i]) continue;
              if (annotation.creator._id !== this.coloredUsers[i]._id) continue;
              color = this.color[i];
            }
          }
          this.annotationmarkerService.createAnnotationMarker(annotation, color);
        }
      })
      .catch(e => console.error(e));
  }

  public drawMarker(newAnnotation: IAnnotation) {

    let color = 'black';
    if (this.coloredUsers.length) {
      const cUserIndex = this.coloredUsers.findIndex(x => x._id === newAnnotation.creator._id);
      if (cUserIndex !== -1 && cUserIndex < this.maxColoredUsersMinusOne) {
        color = this.color[cUserIndex];
      }
    }

    this.annotationmarkerService.createAnnotationMarker(newAnnotation, color);
  }

  public getColor(annotationCreatorId: string): string {
    if (this.inSocket) {
      if (this.coloredUsers.length) {
        const cUserIndex = this.coloredUsers.findIndex(x => x._id === annotationCreatorId);
        if (cUserIndex !== -1 && cUserIndex < this.maxColoredUsersMinusOne) {
          return this.color[cUserIndex];
        } else {
          return '$cardbgr';
        }
      } else {
        return '$cardbgr';
      }
    } else {
      return '$cardbgr';
    }
  }
}
