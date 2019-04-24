import {Injectable} from '@angular/core';
import {Socket} from 'ngx-socket-io';

import {AnnotationService} from '../../services/annotation/annotation.service';
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

// TODO
// -----------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------

// 1.
// BABYLON -- CREATE MARKER

// MARKER:      collaboratorsAnnotations: Annotation[]

// FARBEN:      collaborators: String[]

// 2.
// HTML

// FILTER:

// COLLABORATOR-LIST
// USER-1 [X]
// USER-2 []
// USER-3 [x]

@Injectable({
  providedIn: 'root',
})
export class SocketService {

  // SOCKET_VARIABLES
  public collaboratorsAnnotations: IAnnotation[];
  public collaborators: IUser[];

  constructor(public socket: Socket,
              public annotationService: AnnotationService,
              private loadModelService: LoadModelService,
              private userdataService: UserdataService) {

    // 1.
    // EVENTS

    // (EVENT-NAMEN)
    // -- message
    // -- onlineCollaborators
    // -- createAnnotation
    // -- editAnnotation
    // -- deleteAnnotation
    // -- changeRanking
    // -- lostConnection
    // -- logout
    // -- newUser
    // -- changeRoom
    // -- myNewRoom

    // 1.1
    // EVENT SENDEN                                                                                     // this.socket.emit(eventName, data);
    // 1.1.1
    // - Annotation erstellen
    // this.socket.emit(eventName, data);
    // emit "createAnnotation"
    // 1.1.2
    // - Annotation bearbeiten (und aufs Auge klicken)
    // this.socket.emit(eventName, data);
    // emit "editAnnotation"
    // 1.1.3
    // - Ranking der Annotation ändern
    // this.socket.emit(eventName, data);
    // emit "changeRanking"
    // 1.1.4
    // - Löschen der Annotation
    // this.socket.emit(eventName, data);
    // emit "deleteAnnotation"
    // 1.1.5
    // -- Verbinden (Raum)
    // this.socket.emit(eventName, data);
    // emit "changeRoom" (for miself)
    // emit "newUser" (für andere)
    // 1.1.6
    // -- Verbindung trennen (Raum)
    // this.socket.emit(eventName, data);
    // emit "lostConnection"
    // 1.1.7
    // -- Wählen eines anderen Modells/Collection       ---  Verbindung trennen (alter Raum) --> Verbinden (neuer Raum)
    // this.socket.emit(eventName, data);
    // emit "changeRoom"

    // 1.2
    // EVENT EMPFANGEN                                                                                 // this.socket.fromEvent('eventName').subscribe(result => console.log(result));
    // 1.2.1
    // -- Wenn man dem Raum beitritt
    // emit "onlineCollaborators"
    // get "fromEvent('onlineCollaborators').subscribe(data)"
    // 1.2.2
    // -- Wenn eine Person eine Annotation erstellt
    // get "fromEvent('createAnnotation').subscribe(data)"
    // push "data" (Person-Annotation) to 'collaboratorsAnnotations'
    // 1.2.3
    // -- Wenn eine Person eine Annotation bearbeitet
    // get "fromEvent('editAnnotation').subscribe(data)"
    // delete "data-id" & push "data" (Person-Annotation) from & to 'collaboratorsAnnotations'
    // 1.2.4
    // -- Wenn eine Person eine Annotaiton löscht
    // get "fromEvent('deleteAnnotation').subscribe(data)"
    // delete "data" (Person-Annotation) from 'collaboratorsAnnotations'
    // 1.2.5
    // -- Wenn eine Person das Ranking bearbeitet
    // get "fromEvent('changeRanking').subscribe(data)"
    // get "data" (new ranking Person-Annotations) to 'collaboratorsAnnotations'
    // 1.2.6
    // -- Wenn eine Person die Verbindung verliert
    // get "fromEvent('lostConnection').subscribe(data)"
    // delete "data" (Person-Annotations) from 'collaboratorsAnnotations'
    // 1.2.7
    // -- Wenn eine neue Person dazu kommt
    // get "fromEvent('newUser').subscribe(data)"
    // push "data" (Person-AnnotationS) to 'collaboratorsAnnotations'
    // 1.2.8
    // -- Wenn eine Person den Raum verlässt
    // get "fromEvent('changeRoom').subscribe(data)"
    // delete "data" (Person-Annotations) from 'collaboratorsAnnotations'

    this.annotationService.inSocket = false;
    this.collaboratorsAnnotations = [];
    this.collaborators = [];
    this.annotationService.coloredUsers = [];

    // SET -- 'this.annotationService.socketRoom'
    this.loadModelService.Observables.actualModel.subscribe(actualModel => {
      const currentCompilation = this.loadModelService.getCurrentCompilation();
      const currentModel = this.loadModelService.getCurrentModel();
      this.annotationService.socketRoom = (currentCompilation)
        ? `${currentCompilation._id}_${currentModel._id}` : `${currentModel._id}`;

      // 'changeRoom'
      if (this.annotationService.inSocket) {
        this.changeSocketRoom();
      }
    });

    // 1.2.0
    this.socket.on('message', (result: IMessage) => {
      console.log(`${result.user.username}: ${result.message}`);
    });

    // 1.2.1
    this.socket.on('newUser', (result: IUserInfo) => {
      console.log(`GET ONLINE USERS OF YOUR ROOM - SOCKET.IO`);
      this.updateCollaboratorInfo(result);
    });

    // 1.2.2
    this.socket.on('createAnnotation', (result: IAnnotation) => {
      console.log(`COLLABORATOR '${result.user.username}' CREATED AN ANNOTATION - SOCKET.IO`);

      this.collaboratorsAnnotations.push(result.annotation);

      this.printInfo();
    });

    // 1.2.3
    this.socket.on('editAnnotation', (result: IAnnotation) => {
      console.log(`COLLABORATOR '${result.user.username}' EDITED AN ANNOTATION - SOCKET.IO`);

      const findIndexById = this.collaboratorsAnnotations
        .findIndex(_socketAnnotation => _socketAnnotation.annotation._id === result.annotation._id);
      if (findIndexById !== -1) {
        this.collaboratorsAnnotations.splice(findIndexById, 1, result.annotation);
      }

      this.printInfo();
    });

    // 1.2.4
    this.socket.on('deleteAnnotation', (result: IAnnotation) => { // [socket.id, annotation]
      console.log(`COLLABORATOR '${result.user.username}' DELETED AN ANNOTATION- SOCKET.IO`);

      const findIndexById = this.collaboratorsAnnotations
        .findIndex(_socketAnnotation => _socketAnnotation.annotation._id === result.annotation._id);
      if (findIndexById !== -1) {
        this.collaboratorsAnnotations.splice(findIndexById, 1);
      }

      this.printInfo();
    });

    // 1.2.5
    this.socket.on('changeRanking', (result: IChangeRanking) => {
      console.log(`COLLABORATOR '${result.user.username}' CHANGED ANNOTATION-RANKING - SOCKET.IO`);

      let i = 0;
      for (const socketAnnotation of this.collaboratorsAnnotations) {
        for (let j = 0; j < result.oldRanking.length; j++) {
          if (result.oldRanking[j] === socketAnnotation.annotation._id) {
            this.collaboratorsAnnotations[i].annotation.ranking = result.newRanking[j];
          }
        }
        i++;
      }

      this.printInfo();
    });

    // 1.2.6
    this.socket.on('lostConnection', (result: IUserInfo) => { // [user, annotations]);
      console.log(`COLLABORATOR '${result.user.username}' LOGGED OUT - SOCKET.IO`);

      // delete user from collaborators
      let userCounter = 0;
      for (const collaborator of this.collaborators) {
        if (collaborator === result.user) {
          this.collaborators.splice(userCounter, 1);
          this.sortUser();
        }
        userCounter++;
      }
      // delete his/her annotations from collaboratorsAnnotations
      for (const logoutAnnotation of result.annotations) {
        let i = 0;
        for (const socketAnnotation of this.collaboratorsAnnotations) {
          if (socketAnnotation.annotation._id === logoutAnnotation._id) {
            this.collaboratorsAnnotations.splice(i, 1);
            this.sortUser();
          }
          i++;
        }
      }

      this.printInfo();
    });

    // 1.2.6.b
    this.socket.on('logout', result => { // socket.id
      console.log(`logging out of Socket.io...`);
      console.log(`DISCONNECTED FROM SOCKET.IO`);
    });

    // 1.2.8
    this.socket.on('changeRoom', result => {  // [socket.id(User), annotations]
      console.log(`COLLABORATOR '${result[0]}' CHANGED ROOM - SOCKET.IO`);

      // delete user from collaborators
      let userCounter = 0;
      for (const collaborator of this.collaborators) {
        if (collaborator === result[0]) {
          this.collaborators.splice(userCounter, 1);
          this.sortUser();
        }
        userCounter++;
      }
      // delete his/her annotations from collaboratorsAnnotations
      for (const changeRoomAnnotation of result[1]) {
        let i = 0;
        for (const socketAnnotation of this.collaboratorsAnnotations) {
          if (socketAnnotation.annotation._id === changeRoomAnnotation._id) {
            this.collaboratorsAnnotations.splice(i, 1);
          }
          i++;
        }
      }

      this.printInfo();
    });

    // Lost connection to server
    this.socket.on('disconnect', () => {
      this.annotationService.inSocket = false;
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

  // 1.1.5
  public async loginToSocket() {
    this.annotationService.inSocket = true;
    this.socket.connect();
    console.log(`LOGGING IN TO SOCKET.IO \n ROOM: '${this.annotationService.socketRoom}'`);
    // emit "you" as newUser to other online members of your current room
    const emitData: IUserInfo = this.getOwnSocketData();
    this.socket.emit('newUser', emitData);
    // Request Roomdata from every person in the room
    const emitRequest: IRoomData = {
      info: emitData,
      requester: emitData,
      recipient: this.annotationService.socketRoom,
    };
    this.socket.emit('roomDataRequest', emitRequest);
  }

  // 1.1.6
  public async disconnectSocket() {
    this.annotationService.inSocket = false;
    this.collaborators = [];
    this.sortUser();
    this.collaboratorsAnnotations = [];
    // send info to other Room members,
    // then emit 'logout' from Socket.id for this User
    await this.socket.emit('logout', {annotations: this.annotationService.annotations});
    this.socket.disconnect();
  }

  // 1.1.7
  public async changeSocketRoom() {
    this.collaborators = [];
    this.sortUser();
    this.collaboratorsAnnotations = [];
    const emitData: IChangeRoom = {
      newRoom: this.annotationService.socketRoom,
      annotations: this.annotationService.annotations,
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
      const foundInLocalAnnotations = this.annotationService.annotations
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
    return {
      user: {
        _id: this.userdataService.currentUserData._id,
        fullname: this.userdataService.currentUserData.fullname,
        username: this.userdataService.currentUserData.username,
        room: this.annotationService.socketRoom,
        socketId: 'self',
      },
      annotations: this.annotationService.annotations,
    };
  }

  public sortUser(addAsLast?: IUser) {
    if (this.collaborators.length) {
      const index = this.collaborators.findIndex(x => x.socketId === this.socket.ioSocket.id);
      if (index !== 0) {
        this.collaborators.splice(0, 0, this.collaborators.splice(index, 1)[0]);

      if (addAsLast) {
        const newUserIndex = this.collaborators.findIndex(x => x.socketId === addAsLast.socketId);
        if (newUserIndex !== 0) {
          if (this.collaborators.length < this.annotationService.maxColoredUsersMinusOne) {
            this.collaborators.splice(this.collaborators.length, 0, this.collaborators.splice(newUserIndex, 1)[0]);
          } else {
            this.collaborators.splice(this.annotationService.maxColoredUsersMinusOne, 0, this.collaborators.splice(newUserIndex, 1)[0]);
          }
        }
      }
      } else {
        this.annotationService.coloredUsers = this.collaborators;
      }
      this.annotationService.coloredUsers = this.collaborators;
      this.annotationService.redrawMarker();
    } else {
      this.annotationService.redrawMarker();
    }
  }
}
