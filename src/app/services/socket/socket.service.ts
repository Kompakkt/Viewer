import {EventEmitter, Injectable, Output} from '@angular/core';
import {Socket} from 'ngx-socket-io';

import {Annotation} from '../../interfaces/annotation2/annotation2';
import {AnnotationmarkerService} from '../annotationmarker/annotationmarker.service';
import {LoadModelService} from '../load-model/load-model.service';
import {UserdataService} from '../userdata/userdata.service';

interface IAnnotation {
  annotation: any;
  user: IUser;
}

interface IMessage {
  message: string;
  user: IUser;
}

interface IUser {
  _id: string;
  socketId: string;
  username: string;
  fullname: string;
  room: string;
}

interface IUserInfo {
  user: IUser;
  annotations: any[];
}

interface IChangeRoom {
  newRoom: string;
  annotations: any[];
}

interface IChangeRanking {
  user: IUser;
  oldRanking: any[];
  newRanking: any[];
}

interface IRoomData {
  requester: IUserInfo;
  recipient: string;
  info: IUserInfo;
}

@Injectable({
  providedIn: 'root',
})
export class SocketService {

  public collaboratorsAnnotations: IAnnotation[] = [];
  public collaborators: IUser[] = [];
  public socketRoom: string;
  private isInSocket = false;
  @Output() inSocket: EventEmitter<boolean> = new EventEmitter();

  public coloredUsers: any[] = [];
  public color = ['pink', 'red', 'blue', 'yellow', 'purple', 'gold'];
  public maxColoredUsersMinusOne = this.color.length - 1;

  public annotationsForSocket: Annotation[] = [];

  constructor(public socket: Socket,
              private loadModelService: LoadModelService,
              private userdataService: UserdataService,
              private annotationmarkerService: AnnotationmarkerService) {
    this.isInSocket = false;
    this.inSocket.emit(false);

    this.loadModelService.Observables.actualModel.subscribe(actualModel => {
      const currentCompilation = this.loadModelService.getCurrentCompilation();
      const currentModel = this.loadModelService.getCurrentModel();
      this.socketRoom = (currentCompilation)
        ? `${currentCompilation._id}_${currentModel._id}` : `${currentModel._id}`;

      if (this.inSocket) {
        this.changeSocketRoom();
      }
    });

    this.socket.on('message', (result: IMessage) => {
      console.log(`${result.user.username}: ${result.message}`);
    });

    this.socket.on('newUser', (result: IUserInfo) => {
      console.log(`GET ONLINE USERS OF YOUR ROOM - SOCKET.IO`);
      this.updateCollaboratorInfo(result);
    });

    this.socket.on('createAnnotation', (result: IAnnotation) => {
      console.log(`COLLABORATOR '${result.user.username}' CREATED AN ANNOTATION - SOCKET.IO`);

      this.collaboratorsAnnotations.push(result.annotation);

      this.printInfo();
    });

    this.socket.on('editAnnotation', (result: IAnnotation) => {
      console.log(`COLLABORATOR '${result.user.username}' EDITED AN ANNOTATION - SOCKET.IO`);

      const findIndexById = this.collaboratorsAnnotations
        .findIndex(_socketAnnotation => _socketAnnotation.annotation._id === result.annotation._id);
      if (findIndexById !== -1) {
        this.collaboratorsAnnotations.splice(findIndexById, 1, result.annotation);
      }

      this.printInfo();
    });

    this.socket.on('deleteAnnotation', (result: IAnnotation) => { // [socket.id, annotation]
      console.log(`COLLABORATOR '${result.user.username}' DELETED AN ANNOTATION- SOCKET.IO`);

      const findIndexById = this.collaboratorsAnnotations
        .findIndex(_socketAnnotation => _socketAnnotation.annotation._id === result.annotation._id);
      if (findIndexById !== -1) {
        this.collaboratorsAnnotations.splice(findIndexById, 1);
      }

      this.printInfo();
    });

    this.socket.on('changeRanking', (result: IChangeRanking) => {
      console.log(`COLLABORATOR '${result.user.username}' CHANGED ANNOTATION-RANKING - SOCKET.IO`);

      for (const collabAnnotation of this.collaboratorsAnnotations) {
        for (let j = 0; j < result.oldRanking.length; j++) {
          if (result.oldRanking[j] !== collabAnnotation.annotation._id) continue;
          collabAnnotation.annotation.ranking = result.newRanking[j];
        }
      }

      this.printInfo();
    });

    // A user lost connection, so we remove knowledge about this user
    this.socket.on('lostConnection', (result: IUserInfo) => { // [user, annotations]);
      console.log(`COLLABORATOR '${result.user.username}' LOGGED OUT - SOCKET.IO`);
      this.removeKnowledgeAboutUser(result);
      this.printInfo();
    });

    this.socket.on('logout', result => { // socket.id
      console.log(`logging out of Socket.io...`);
      console.log(`DISCONNECTED FROM SOCKET.IO`);
    });

    // A user left the room, so we remove knowledge about this user
    this.socket.on('changeRoom', (result: IUserInfo) => {
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
      this.collaboratorsAnnotations = [];
      this.socket.disconnect();
    });

    // Our data is requested
    this.socket.on('roomDataRequest', (result: IRoomData) => {
      result.info = this.getOwnSocketData();
      this.socket.emit('roomDataAnswer', result);
    });

    // We recieved data from someone
    this.socket.on('roomDataAnswer', (result: IRoomData) => {
      this.updateCollaboratorInfo(result.info);
    });
  }

  private removeKnowledgeAboutUser(userInfo: IUserInfo) {
    this.collaborators = this.collaborators.filter(_user => _user._id !== userInfo.user._id);

    for (const removableAnnotation of userInfo.annotations) {
      const annIndex = this.collaboratorsAnnotations
        .findIndex(ann => ann.annotation._id === removableAnnotation._id);
      if (annIndex === -1) continue;
      this.collaboratorsAnnotations.splice(annIndex, 1);
    }

    this.sortUser();
  }

  public loginToSocket() {
    this.isInSocket = true;
    this.inSocket.emit(true);
    this.socket.connect();
    console.log(`LOGGING IN TO SOCKET.IO \n ROOM: '${this.socketRoom}'`);
    // emit "you" as newUser to other online members of your current room
    const emitData: IUserInfo = this.getOwnSocketData();
    this.socket.emit('newUser', emitData);
    // Request Roomdata from every person in the room
    const emitRequest: IRoomData = {
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
    this.collaboratorsAnnotations = [];
    // send info to other Room members,
    // then emit 'logout' from Socket.id for this User
    this.socket.emit('logout', {annotations: this.annotationsForSocket});
    this.socket.disconnect();
  }

  public changeSocketRoom() {
    this.collaborators = [];
    this.sortUser();
    this.collaboratorsAnnotations = [];
    const emitData: IChangeRoom = {
      newRoom: this.socketRoom,
      annotations: this.annotationsForSocket,
    };
    this.socket.emit('changeRoom', emitData);
  }

  private updateCollaboratorInfo(data: IUserInfo) {
    if (!this.collaborators.find(_user => data.user.socketId === _user.socketId)) {
      this.collaborators.push(data.user);
      this.sortUser();
    }
    data.annotations.forEach(annotation => {
      const foundInCollabAnnotations = this.collaboratorsAnnotations
        .find(_socketAnnotation => annotation._id === _socketAnnotation.annotation._id);
      const foundInLocalAnnotations = this.annotationsForSocket
        .find(_annotation => annotation._id === _annotation._id);

      if (!foundInCollabAnnotations && !foundInLocalAnnotations) {
        this.collaboratorsAnnotations.push(annotation);
      }

      if (foundInCollabAnnotations) {
        const annotationIndex = this.collaboratorsAnnotations.indexOf(foundInCollabAnnotations);
        // Replace in place
        this.collaboratorsAnnotations.splice(annotationIndex, 1, annotation);
      }
    });
    this.printInfo();
  }

  private printInfo() {
    console.log('--------------');
    console.log('this.collaborators:');
    console.log(JSON.parse(JSON.stringify(this.collaborators)));
    console.log('this.collaboratorsAnnotations');
    console.log(JSON.parse(JSON.stringify(this.collaboratorsAnnotations)));
  }

  // TODO das wird den anderen Nutzern gesendet
  private getOwnSocketData(): IUserInfo {
    const us = this.userdataService.getUserDataForSocket();
    return {
      user: {
        _id: us._id,
        fullname: us.fullname,
        username: us.username,
        room: this.socketRoom,
        socketId: 'self',
      },
      annotations: this.annotationsForSocket,
    };
  }

  public sortUser(priorityUser?: IUser) {
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

  public initialAnnotationsForSocket(annotations: Annotation[]) {
    this.annotationsForSocket = JSON.parse(JSON.stringify(annotations));
  }

  public annotationChange(annotation: Annotation): Annotation {
    const newAnnotation = JSON.parse(JSON.stringify(annotation));
    const inSocketAnnotation = this.annotationsForSocket
      .find(anno => (anno._id === annotation._id));
    const indexOfAnnotation = this.annotationsForSocket.indexOf(annotation);

    if (!inSocketAnnotation) {
      this.annotationsForSocket.splice(indexOfAnnotation, 1, annotation);
      return annotation;
    }

    const user = this.userdataService.getUserDataForSocket();
    newAnnotation.creator.name = user.fullname;
    newAnnotation.creator._id = user._id;
    this.annotationsForSocket.splice(indexOfAnnotation, 1, newAnnotation);
    return newAnnotation;
  }

  public annotationAdd(annotation: Annotation): Annotation {
    const user = this.userdataService.getUserDataForSocket();
    const newAnnotation = JSON.parse(JSON.stringify(annotation));
    newAnnotation.creator.name = user.fullname;
    newAnnotation.creator._id = user._id;
    this.annotationsForSocket.push(newAnnotation);
    return newAnnotation;
  }

  public annotationDelete(annotation: Annotation) {
    this.annotationsForSocket.splice(this.annotationsForSocket.indexOf(annotation), 1);
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

  public drawMarker(newAnnotation: Annotation) {

    let color = 'black';
    if (this.coloredUsers.length) {
      for (let i = 0; i < this.maxColoredUsersMinusOne; i++) {
        if (!this.coloredUsers[i]) continue;
        if (newAnnotation.creator._id !== this.coloredUsers[i]._id) continue;
        color = this.color[i];
      }
    }

    this.annotationmarkerService.createAnnotationMarker(newAnnotation, color);
  }
}
