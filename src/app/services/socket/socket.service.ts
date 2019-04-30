import {EventEmitter, Injectable, Output} from '@angular/core';
import {Socket} from 'ngx-socket-io';

import {
  IAnnotation, ICompilation, IModel,
  ISocketAnnotation,
  ISocketChangeRanking,
  ISocketChangeRoom,
  ISocketMessage,
  ISocketRoomData,
  ISocketUser,
  ISocketUserInfo
} from '../../interfaces/interfaces';
import {AnnotationmarkerService} from '../annotationmarker/annotationmarker.service';
import {ProcessingService} from '../processing/processing.service';
import {UserdataService} from '../userdata/userdata.service';
import {BehaviorSubject} from 'rxjs/internal/BehaviorSubject';
import {ReplaySubject} from 'rxjs/internal/ReplaySubject';
import * as BABYLON from 'babylonjs';

@Injectable({
  providedIn: 'root',
})
export class SocketService {

  public collaborators: ISocketUser[] = [];
  public socketRoom: string;
  public isInSocket = false;
  @Output() inSocket: EventEmitter<boolean> = new EventEmitter();

  public isBroadcastingAllowed = false;
  @Output() broadcastingAllowed: EventEmitter<boolean> = new EventEmitter();

  public coloredUsers: ISocketUser[] = [];
  public color = ['pink', 'red', 'blue', 'yellow', 'purple', 'gold'];
  public maxColoredUsersMinusOne = this.color.length - 1;

  public annotationsForSocket: IAnnotation[] = [];

  private  isNewAnnotation = new ReplaySubject<IAnnotation>();
  public newAnnotation = this.isNewAnnotation.asObservable();

  constructor(public socket: Socket,
              private processingService: ProcessingService,
              private userdataService: UserdataService,
              private annotationmarkerService: AnnotationmarkerService) {

    this.isInSocket = false;
    this.inSocket.emit(false);

    this.processingService.Observables.actualModel.subscribe(actualModel => {
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

    this.socket.on('message', (result: ISocketMessage) => {
      console.log(`${result.user.username}: ${result.message}`);
    });

    this.socket.on('newUser', (result: ISocketUserInfo) => {
      console.log(`GET ONLINE USERS OF YOUR ROOM - SOCKET.IO`);
      this.updateCollaboratorInfo(result);
    });

    this.socket.on('createAnnotation', (result: ISocketAnnotation) => {
      console.log(`COLLABORATOR '${result.user.username}' CREATED AN ANNOTATION - SOCKET.IO`);
      if (result.user._id !== this.getOwnSocketData().user._id) {
        this.addReceivedAnnotation(result.annotation);
      }
      this.printInfo();
    });

    this.socket.on('editAnnotation', (result: ISocketAnnotation) => {
      console.log(`COLLABORATOR '${result.user.username}' EDITED AN ANNOTATION - SOCKET.IO`);
      if (result.user._id !== this.getOwnSocketData().user._id) {
        this.addReceivedAnnotation(result.annotation);
      }
      this.printInfo();
    });

    this.socket.on('deleteAnnotation', (result: ISocketAnnotation) => { // [socket.id, annotation]
      console.log(`COLLABORATOR '${result.user.username}' DELETED AN ANNOTATION- SOCKET.IO`);
      if (result.user._id !== this.getOwnSocketData().user._id) {
        this.annotationForSocket(result.annotation, 'delete');
      }
      this.printInfo();
    });

    // A user lost connection, so we remove knowledge about this user
    this.socket.on('lostConnection', (result: ISocketUserInfo) => { // [user, annotations]);
      console.log(`COLLABORATOR '${result.user.username}' LOGGED OUT - SOCKET.IO`);
      this.removeKnowledgeAboutUser(result);
      this.printInfo();
    });

    this.socket.on('logout', result => { // socket.id
      console.log(`logging out of Socket.io...`);
      console.log(`DISCONNECTED FROM SOCKET.IO`);
    });

    // A user left the room, so we remove knowledge about this user
    this.socket.on('changeRoom', (result: ISocketUserInfo) => {
      console.log(`COLLABORATOR '${result.user.username}' CHANGED ROOM - SOCKET.IO`);
      this.removeKnowledgeAboutUser(result);
      this.printInfo();
    });

    // Lost connection to server
    this.socket.on('disconnect', () => {
      this.isInSocket = false;
      this.inSocket.emit(false);
      this.collaborators = [];
      this.sortUser();
      // this.collaboratorsAnnotations = [];
      this.socket.disconnect();
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
  }

  public updateNewAnnotation(annotation: IAnnotation) {
    this.isNewAnnotation.next(annotation);
  }

  public getCurrentAnnotation(): IAnnotation | null {
    return this.isNewAnnotation.source['_events'].slice(-1)[0];
  }

  private removeKnowledgeAboutUser(userInfo: ISocketUserInfo) {
    this.collaborators = this.collaborators.filter(_user => _user._id !== userInfo.user._id);

    /*
    for (const removableAnnotation of userInfo.annotations) {
      const annIndex = this.collaboratorsAnnotations
        .findIndex(ann => ann.annotation._id === removableAnnotation._id);
      if (annIndex === -1) continue;
      this.collaboratorsAnnotations.splice(annIndex, 1);
    }*/

    this.sortUser();
  }

  public loginToSocket() {
    this.isInSocket = true;
    this.inSocket.emit(true);
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
  }

  public disconnectSocket() {
    this.isInSocket = false;
    this.inSocket.emit(false);
    this.collaborators = [];
    this.sortUser();
    // this.collaboratorsAnnotations = [];
    // send info to other Room members,
    // then emit 'logout' from Socket.id for this User
    this.socket.emit('logout', {annotations: this.annotationsForSocket});
    this.socket.disconnect();
  }

  public changeSocketRoom() {
    this.collaborators = [];
    this.sortUser();
    // this.collaboratorsAnnotations = [];
    const emitData: ISocketChangeRoom = {
      newRoom: this.socketRoom,
      annotations: this.annotationsForSocket,
    };
    this.socket.emit('changeRoom', emitData);
  }

  private updateCollaboratorInfo(data: ISocketUserInfo) {
    if (!this.collaborators.find(_user => data.user.socketId === _user.socketId)) {
      this.collaborators.push(data.user);
      this.sortUser();
    }
    data.annotations.forEach(annotation => {
      console.log('Bekomme in Socket von Collab: ', annotation);
      this.addReceivedAnnotation(annotation);
    });

    const sortMeArray = JSON.parse(JSON.stringify(this.annotationsForSocket));
    this.sortAnnotations(sortMeArray);

    this.printInfo();
  }

  private addReceivedAnnotation(receivedAnno: IAnnotation) {
    const foundInOwnSocketAnnotations = this.annotationsForSocket
      .find(_socketAnnotation => _socketAnnotation._id === receivedAnno._id);

    if (foundInOwnSocketAnnotations && foundInOwnSocketAnnotations.lastModificationDate && receivedAnno.lastModificationDate) {
      if (foundInOwnSocketAnnotations.lastModificationDate < receivedAnno.lastModificationDate) {
        const annotationIndex = this.annotationsForSocket.indexOf(foundInOwnSocketAnnotations);
        this.annotationsForSocket.splice(annotationIndex, 1, receivedAnno);
      }
    } else {
      this.annotationsForSocket.push(receivedAnno);
      this.updateNewAnnotation(receivedAnno);
    }
  }

  private printInfo() {
    console.log('--------------');
    console.log('this.collaborators:');
    console.log(JSON.parse(JSON.stringify(this.collaborators)));
    console.log('this.collaboratorsAnnotations');
    console.log(JSON.parse(JSON.stringify(this.annotationsForSocket)));
  }

  // TODO das wird den anderen Nutzern gesendet
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
      annotations: this.annotationsForSocket,
    };
  }

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

  public initialAnnotationsForSocket(annotations: IAnnotation[]) {
    this.annotationsForSocket = JSON.parse(JSON.stringify(annotations));
  }

  public annotationForSocket(anno: IAnnotation, action: string) {

    const annotationIndex = this.annotationsForSocket
      .findIndex(a => a._id === anno._id);

    console.log(anno, action);
    switch (action) {
      case 'delete':
        if (annotationIndex !== -1) {
          this.annotationsForSocket.splice(annotationIndex, 1);
        }
        if (this.inSocket) {
          this.socket.emit('deleteAnnotation', {annotation: anno});
          return;
        } else {
          return;
        }

      case 'update':
        console.log('update', annotationIndex);
        if (annotationIndex !== -1) {
          this.annotationsForSocket.splice(annotationIndex, 1,
                                           this.modifyAnnotationforSocket(anno));
          if (this.inSocket) {
            this.socket.emit('editAnnotation',
                             {annotation: this.modifyAnnotationforSocket(anno)});
            return;
        }} else {
          this.annotationsForSocket.push(this.modifyAnnotationforSocket(anno));
          if (this.inSocket) {
            this.socket.emit('createAnnotation',
                             {annotation: this.modifyAnnotationforSocket(anno)});
            this.drawMarker(this.modifyAnnotationforSocket(anno));
            return;
        }}
      default:
        console.log('No valid action passed');
    }
    throw new Error('Should not be reachable');
  }

  public modifyAnnotationforSocket(anno: IAnnotation): IAnnotation {
    const annotationIndex = this.annotationsForSocket
      .findIndex(annot => annot._id === anno._id);
    if (annotationIndex === -1) {
      const _manipulatedAnno = JSON.parse(JSON.stringify(anno));
      const _manipulatedCreator = this.userdataService.getUserDataForSocket();
      _manipulatedAnno.creator.name = _manipulatedCreator.fullname;
      _manipulatedAnno.creator._id = _manipulatedCreator._id;
      this.annotationsForSocket.push(_manipulatedAnno);
      return _manipulatedAnno;
    } else {
      const _manipulatedAnno = JSON.parse(JSON.stringify(anno));
      const _keepCreator = this.annotationsForSocket[annotationIndex].creator;
      _manipulatedAnno.creator = _keepCreator;
      return _manipulatedAnno;
    }
  }

  public redrawMarker() {
    this.annotationmarkerService.deleteAllMarker()
      .then(() => {
        for (const annotation of this.annotationsForSocket) {
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

  private async sortAnnotations(toBesorted: any[]) {
    let sortMe = toBesorted;

    this.annotationsForSocket = sortMe;
    sortMe = this.annotationsForSocket.slice(0);
    this.annotationsForSocket.splice(0, this.annotationsForSocket.length);
    this.annotationsForSocket = sortMe.slice(0);

    await this.annotationsForSocket.sort((leftSide, rightSide): number => {
      if (+leftSide.ranking < +rightSide.ranking) {
        return -1;
      }
      if (+leftSide.ranking > +rightSide.ranking) {
        return 1;
      }
      return 0;
    });

    this.redrawMarker();
  }

  public setBroadcastingAllowance(allowance: boolean) {
    console.log('set', allowance);
    this.isBroadcastingAllowed = allowance;
    this.broadcastingAllowed.emit(allowance);
  }
}
