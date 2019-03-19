import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import {Annotation} from 'src/app/interfaces/annotation2/annotation2';
import {AnnotationService} from '../../services/annotation/annotation.service';

import {LoadModelService} from '../load-model/load-model.service';


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
  providedIn: 'root'
})
export class SocketService {

  // SOCKET_VARIABLES 
  public collaboratorsAnnotations: Annotation[];
  public collaborators: String[];


  constructor(public socket: Socket, public annotationService: AnnotationService, private loadModelService: LoadModelService) {

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

    // SET -- 'this.annotationService.socketRoom'
    this.loadModelService.Observables.actualModel.subscribe(actualModel => {
      
      const oldSocketRoom = this.annotationService.socketRoom;
      
      if (this.annotationService.currentCompilation !== undefined){
        if (this.annotationService.currentCompilation.name != undefined){
          this.annotationService.socketRoom = this.annotationService.currentCompilation.name + '_' + this.annotationService.modelName;
        }
        else {
          this.annotationService.socketRoom = this.annotationService.modelName;
        }
      }
      else {
        this.annotationService.socketRoom = this.annotationService.modelName;
      }

      // 'changeRoom'
      if (this.annotationService.inSocket){
        this.changeSocketRoom(oldSocketRoom);
      }
    });



    // 1.2.0
    this.socket.on('message', result => { // message
      console.log("MESSAGE - SOCKET.IO: \n" + result);
    });


    // 1.2.1
    this.socket.on('onlineCollaborators', result => {     // [socket.id, annotations]
      console.log(`GET ONLINE USERS OF YOUR ROOM - SOCKET.IO`);     

      // check if onlineCollaborator in this.collaborators 
      let isNewCollaborator = true;
      for (const collaborator of this.collaborators){
        if (collaborator === result[0]){
          isNewCollaborator = false;
        }
      }
      // onlineCollaborator NOT member of this.collaborators
      if (isNewCollaborator){
        this.collaborators.push(result[0]);
      }
      // push annotations's of User to this.collaboratorsAnnotations
      for (const annotation of result[1]) {
        // check if duplicate of this.collaboratorsAnnotations
        let isCollaboratorAnnotation = false;
        for (const collaboratorsAnnotation of this.collaboratorsAnnotations){
          if (annotation._id === collaboratorsAnnotation._id){
            isCollaboratorAnnotation = true;
          }
        }
        // check if duplicate of this.annotationService.annotations
        let isLocalAnnotation = false;
        for (const localAnnotation of this.annotationService.annotations){
          if (annotation._id === localAnnotation._id){
            isLocalAnnotation = true;
          }
        }
        // if no duplicate
        if (!isCollaboratorAnnotation && !isLocalAnnotation){
          this.collaboratorsAnnotations.push(annotation);
        }
        // if duplicate of this.collaboratorsAnnotations, 
        // replace the old Annotation with the new Annotation
        if (isCollaboratorAnnotation) {
          let i = 0;
          for (const collaboratorsAnnotation of this.collaboratorsAnnotations){
            if (annotation._id === collaboratorsAnnotation._id){
              this.collaboratorsAnnotations[i] = annotation;
            }
            i++;
          }
        }
      }
      
      console.log("--------------");
      console.log("this.collaborators:");
      console.log(JSON.parse(JSON.stringify(this.collaborators)));
      console.log("this.collaboratorsAnnotations");
      console.log(JSON.parse(JSON.stringify(this.collaboratorsAnnotations)));
    });
    


    // 1.2.2
    this.socket.on('createAnnotation', result => { // [socket.id, annotation]      
      console.log(`COLLABORATOR '${result[0]}' CREATED AN ANNOTATION - SOCKET.IO`);     

      this.collaboratorsAnnotations.push(result[1]);

      
      console.log("--------------");
      console.log("this.collaborators:");
      console.log(JSON.parse(JSON.stringify(this.collaborators)));
      console.log("this.collaboratorsAnnotations");
      console.log(JSON.parse(JSON.stringify(this.collaboratorsAnnotations)));
    });
    

    // 1.2.3
    this.socket.on('editAnnotation', result => { //  [socket.id, annotation]
      console.log(`COLLABORATOR '${result[0]}' EDITED AN ANNOTATION - SOCKET.IO`);     

      let i = 0;
      for (const annotation of this.collaboratorsAnnotations){
        if (annotation._id === result[1]._id){
            this.collaboratorsAnnotations[i] = result[1];
        }
        i++;
      }
      
      console.log("--------------");
      console.log("this.collaborators:");
      console.log(JSON.parse(JSON.stringify(this.collaborators)));
      console.log("this.collaboratorsAnnotations");
      console.log(JSON.parse(JSON.stringify(this.collaboratorsAnnotations)));
    });


    // 1.2.4
    this.socket.on('deleteAnnotation', result => { // [socket.id, annotation]
      console.log(`COLLABORATOR '${result[0]}' DELETED AN ANNOTATION- SOCKET.IO`);     

      let i = 0;
      for (const annotation of this.collaboratorsAnnotations){
        if (annotation._id === result[1]._id){
            this.collaboratorsAnnotations.splice(i, 1);
        }
        i++;
      }
      
      console.log("--------------");
      console.log("this.collaborators:");
      console.log(JSON.parse(JSON.stringify(this.collaborators)));
      console.log("this.collaboratorsAnnotations");
      console.log(JSON.parse(JSON.stringify(this.collaboratorsAnnotations)));
    });


    // 1.2.5
    this.socket.on('changeRanking', result => {  //  [socket.id, IdArray, RankingArray]
      console.log(`COLLABORATOR '${result[0]}' CHANGED ANNOTATION-RANKING - SOCKET.IO`);     

      let i = 0;
      for (const annotation of this.collaboratorsAnnotations){       
        for (let j=0; j < result[1].length; j++){
          if (result[1][j] === annotation._id){
            this.collaboratorsAnnotations[i].ranking = result[2][j];
          }
        }
        i++;
      }    
      
      console.log("--------------");
      console.log("this.collaborators:");
      console.log(JSON.parse(JSON.stringify(this.collaborators)));
      console.log("this.collaboratorsAnnotations");
      console.log(JSON.parse(JSON.stringify(this.collaboratorsAnnotations)));
    });


    // 1.2.6 
    this.socket.on('lostConnection', result => { // [user, annotations]);
      console.log(`COLLABORATOR '${result[0]}' LOGGED OUT - SOCKET.IO`);     
      
      // delete user from collaborators
      let userCounter = 0;
      for (const collaborator of this.collaborators){
        if (collaborator === result[0]){
          this.collaborators.splice(userCounter, 1);
        }
        userCounter++;
      }
      // delete his/her annotations from collaboratorsAnnotations
      for (const logoutAnnotation of result[1]){
        let i = 0;
        for (const collaboratorsAnnotation of this.collaboratorsAnnotations){
          if (collaboratorsAnnotation._id === logoutAnnotation._id){
              this.collaboratorsAnnotations.splice(i, 1);
          }
          i++;
        }
      }
      
      console.log("--------------");
      console.log("this.collaborators:");
      console.log(JSON.parse(JSON.stringify(this.collaborators)));
      console.log("this.collaboratorsAnnotations");
      console.log(JSON.parse(JSON.stringify(this.collaboratorsAnnotations)));
    });

    // 1.2.6.b
    this.socket.on('logout', result => { // socket.id
      console.log(`logging out of Socket.io...`); 
      this.socket.disconnect();
      console.log(`DISCONNECTED FROM SOCKET.IO`);
    }); 


    // 1.2.7
    this.socket.on('newUser', result => { // [newUser, newUser.annotations]
      console.log(`NEW COLLABORATOR: '${result[0]}' - SOCKET.IO`);     

      // check if newUser in this.collaborators 
      let isNewCollaborator = true;
      for (const collaborator of this.collaborators){
        if (collaborator === result[0]){
          isNewCollaborator = false;
        }
      }  
      // if newUser NOT member of this.collaborators
      if (isNewCollaborator) {
        this.collaborators.push(result[0]);
      }
      // push annotations's of user to this.collaboratorsAnnotations
      for (const annotation of result[1]) {
        // check if duplicate of this.collaboratorsAnnotations
        let isCollaboratorAnnotation = false;
        for (const collaboratorsAnnotation of this.collaboratorsAnnotations){
          if (annotation._id === collaboratorsAnnotation._id){
            isCollaboratorAnnotation = true;
          }
        }
        // check if duplicate of this.annotationService.annotations
        let isLocalAnnotation = false;
        for (const localAnnotation of this.annotationService.annotations){
          if (annotation._id === localAnnotation._id){
            isLocalAnnotation = true;
          }
        }
        // if no duplicate
        if (!isCollaboratorAnnotation && !isLocalAnnotation){
          this.collaboratorsAnnotations.push(annotation);
        }
        // if collaborator duplicate
        if (isCollaboratorAnnotation) {
          
          // if duplicate of this.collaboratorsAnnotations, 
          // replace the old Annotation with the new Annotation
          let i = 0;
          for (const collaboratorsAnnotation of this.collaboratorsAnnotations){
            if (annotation._id === collaboratorsAnnotation._id){
              this.collaboratorsAnnotations[i] = annotation;
            }
            i++;
          }
        }
      }
      // Send this User's annotations to the 'newUser'
      this.socket.emit('onlineCollaborators', [result[0], this.annotationService.annotations]);    // [newUser, this.annotationService.annotations]
      // 
      
      console.log("--------------");
      console.log("this.collaborators:");
      console.log(JSON.parse(JSON.stringify(this.collaborators)));
      console.log("this.collaboratorsAnnotations:");
      console.log(JSON.parse(JSON.stringify(this.collaboratorsAnnotations)));
    });

    // 1.2.8
    this.socket.on('changeRoom', result => {  // [socket.id(User), annotations]
      console.log(`COLLABORATOR '${result[0]}' CHANGED ROOM - SOCKET.IO`);     
      
      // delete user from collaborators
      let userCounter = 0;
      for (const collaborator of this.collaborators){
        if (collaborator === result[0]){
          this.collaborators.splice(userCounter, 1);
        }
        userCounter++;
      }
      // delete his/her annotations from collaboratorsAnnotations
      for (const changeRoomAnnotation of result[1]){
        let i = 0;
        for (const collaboratorsAnnotation of this.collaboratorsAnnotations){
          if (collaboratorsAnnotation._id === changeRoomAnnotation._id){
              this.collaboratorsAnnotations.splice(i, 1);
          }
          i++;
        }
      }
      
      console.log("--------------");
      console.log("this.collaborators:");
      console.log(JSON.parse(JSON.stringify(this.collaborators)));
      console.log("this.collaboratorsAnnotations");
      console.log(JSON.parse(JSON.stringify(this.collaboratorsAnnotations)));
    });


    // 1.2.8.b
    this.socket.on('myNewRoom', result => { // newSocketRoom
      console.log(`LEFT ROOM: ${result[0]}'`); 
      console.log(`JOINED ROOM: ${result[1]}'`); 
    }); 

  }




  // 1.1.5
  public async loginToSocket(){
    this.annotationService.inSocket = true; 
    this.socket.connect(); 
    console.log(`LOGGING IN TO SOCKET.IO \n ROOM: '${this.annotationService.socketRoom}'`);
    // emit "you" as newUser to other online members of your current room  
    this.socket.emit('newUser', [this.annotationService.socketRoom, this.annotationService.annotations]);
  }

  // 1.1.6
  public async disconnectSocket(){
    this.annotationService.inSocket = false; 
    this.collaborators = [];
    this.collaboratorsAnnotations = [];
    // send info to other Room members,
    // then emit 'logout' from Socket.id for this User 
    await this.socket.emit('lostConnection', [this.annotationService.socketRoom, this.annotationService.annotations]);
  }

  // 1.1.7
  public async changeSocketRoom(oldSocketRoom){
      this.collaborators = [];
      this.collaboratorsAnnotations = [];
      this.socket.emit('changeRoom', [oldSocketRoom, this.annotationService.socketRoom, this.annotationService.annotations]);
  }
}
