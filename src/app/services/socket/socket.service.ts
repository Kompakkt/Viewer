import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import {Annotation} from 'src/app/interfaces/annotation2/annotation2';
import {AnnotationService} from '../../services/annotation/annotation.service';

import {LoadModelService} from '../load-model/load-model.service';

// 2.
// SOCKET.IO
// -----------------------------------------------------------------------------------------------------------------------
// HTML ELEMENTE 

        // -- FILTER (BEI LOGGED-IN)
                      // USER-LISTE
                                // USER-X (Aus-/Einblenden)


// 3.
// -----------------------------------------------------------------------------------------------------------------------
// BABYLON ELEMENTE  

        // CREATE MARKER 
              // --  "public collaboratorsAnnotations: Annotation[];"
                      // -- MARKER-FARBEN
                              // (NACH USER-ID)

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
      // -- createAnnotation
      // -- editAnnotation
      // -- deleteAnnotation
      // -- changeRanking

      // -- newUser
      // -- lostConnection
      // -- onlineCollaborators           
      // -- changeRoom

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
    

    // SOCKET_Variables
    this.annotationService.inSocket = false;
    this.collaboratorsAnnotations = [];
    this.collaborators = [];

    // SET SOCKETROOM (this.annotationService.socketRoom)
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

      // Emit 'changeRoom'
      if (this.annotationService.inSocket){
        this.changeSocketRoom(oldSocketRoom);
      }
    });


    // 1.2.0
    this.socket.on('message', result => { 
      console.log("message: " + result);
    });


    // 1.2.1
    this.socket.on('onlineCollaborators', result => {     // [socket.id, annotations]
      console.log(`GET INFOS of online users in room '${this.annotationService.socketRoom}'`);

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
        console.log(`push Online User '${result[0]}' to  this.collaborator.`);
      }
      // onlineCollaborator member of this.collaborators
      else if (!isNewCollaborator) {
        console.log(`Online User '${result[0]}' already known Collaborator.`); 
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
        // if duplicate of this.collaboratorsAnnotations, replace the old Annotation with the new Annotation
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

      console.log("SOCKET.IO INFO");
      console.log("--------------");
      console.log("this.collaborators:");
      console.log(JSON.parse(JSON.stringify(this.collaborators)));
      console.log("this.collaboratorsAnnotations");
      console.log(JSON.parse(JSON.stringify(this.collaboratorsAnnotations)));
    });
    


    // 1.2.2
    this.socket.on('createAnnotation', result => { // result [socket.id, annotation]
      
      this.collaboratorsAnnotations.push(result[1]);
      console.log(`Online User '${result[0]}' created a new Annotation.`); 


      console.log("SOCKET.IO INFO");
      console.log("--------------");
      console.log("this.collaborators:");
      console.log(JSON.parse(JSON.stringify(this.collaborators)));
      console.log("this.collaboratorsAnnotations");
      console.log(JSON.parse(JSON.stringify(this.collaboratorsAnnotations)));
    });
    



    // 1.2.3
    this.socket.on('editAnnotation', result => { //  [socket.id, annotation]

      let i = 0;
      for (const annotation of this.collaboratorsAnnotations){
        if (annotation._id === result[1]._id){
            this.collaboratorsAnnotations[i] = result[1];
            console.log(`Online User '${result[0]}' edited the CollaboratorsAnnotation with id '${result[1]._id}'`); 
        }
        i++;
      }

      console.log("SOCKET.IO INFO");
      console.log("--------------");
      console.log("this.collaborators:");
      console.log(JSON.parse(JSON.stringify(this.collaborators)));
      console.log("this.collaboratorsAnnotations");
      console.log(JSON.parse(JSON.stringify(this.collaboratorsAnnotations)));
    });




    // 1.2.4
    this.socket.on('deleteAnnotation', result => { // [socket.id, annotation]

      let i = 0;
      for (const annotation of this.collaboratorsAnnotations){
        if (annotation._id === result[1]._id){
            this.collaboratorsAnnotations.splice(i, 1);
            console.log(`Online User '${result[0]}' deleted CollaboratorsAnnotation '${result[1]._id}'`); 
        }
        i++;
      }


      console.log("SOCKET.IO INFO");
      console.log("--------------");
      console.log("this.collaborators:");
      console.log(JSON.parse(JSON.stringify(this.collaborators)));
      console.log("this.collaboratorsAnnotations");
      console.log(JSON.parse(JSON.stringify(this.collaboratorsAnnotations)));
    });




    // 1.2.5
    this.socket.on('changeRanking', result => {  //  [socket.id, IdArray, RankingArray]
      
      let i = 0;
      for (const annotation of this.collaboratorsAnnotations){       
        for (let j=0; j < result[1].length; j++){
          if (result[1][j] === annotation._id){
            this.collaboratorsAnnotations[i].ranking = result[2][j];
          }
        }
        i++;
      }    
      console.log(`Online User '${result[0]}' in Room ${this.annotationService.socketRoom} changed ranking of his/her Annotations (for this.CollaboratorsAnnotation)`);     


      console.log("SOCKET.IO INFO");
      console.log("--------------");
      console.log("this.collaborators:");
      console.log(JSON.parse(JSON.stringify(this.collaborators)));
      console.log("this.collaboratorsAnnotations");
      console.log(JSON.parse(JSON.stringify(this.collaboratorsAnnotations)));
    });




    // 1.2.6 
    this.socket.on('lostConnection', result => { // [user, annotations]);
      
      console.log(`User '${result[0]}' in Room ${this.annotationService.socketRoom} logged out from Socket.io`);     
      console.log(`Delete his/her information's in collaborator's!`);     
      
      // delete user from collaborators
      let userCounter = 0;
      for (const collaborator of this.collaborators){
        if (collaborator === result[0]){
          this.collaborators.splice(userCounter, 1);
          // console.log(`Deletet User '${result[0]}' from this.collaborators`);     
        }
        userCounter++;
      }
      // delete his/her annotations from collaboratorsAnnotations
      for (const logoutAnnotation of result[1]){
        let i = 0;
        for (const collaboratorsAnnotation of this.collaboratorsAnnotations){
          if (collaboratorsAnnotation._id === logoutAnnotation._id){
              this.collaboratorsAnnotations.splice(i, 1);
              // console.log(`Deletet Annotation '${logoutAnnotation._id}' of User '${result[0]}' from this.collaboratorsAnnotations`);     
          }
          i++;
        }
      }

      
      console.log("SOCKET.IO INFO");
      console.log("--------------");
      console.log("this.collaborators:");
      console.log(JSON.parse(JSON.stringify(this.collaborators)));
      console.log("this.collaboratorsAnnotations");
      console.log(JSON.parse(JSON.stringify(this.collaboratorsAnnotations)));
    });




    // 1.2.7
    this.socket.on('newUser', result => {                       // result [newUser, newUser.annotations]
    
      // check if newUser in this.collaborators 
      let isNewCollaborator = true;
      for (const collaborator of this.collaborators){
        if (collaborator === result[0]){
          isNewCollaborator = false;
        }
      }  
      // newUser NOT member of this.collaborators
      if (isNewCollaborator) {
        this.collaborators.push(result[0]);
        console.log(`New User '${result[0]}' joined your room '${this.annotationService.socketRoom}' as Collaborator.`); 
      }
      // newUser member of this.collaborators
      else if (!isNewCollaborator) {
        console.log(`Known User '${result[0]}' is relloging to your room '${this.annotationService.socketRoom}' as Collaborator.`); 
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
          
          // if duplicate of this.collaboratorsAnnotations, replace the old Annotation with the new Annotation
          let i = 0;
          for (const collaboratorsAnnotation of this.collaboratorsAnnotations){
            if (annotation._id === collaboratorsAnnotation._id){
              this.collaboratorsAnnotations[i] = annotation;
            }
            i++;
          }
        }
      }
    

      console.log("SOCKET.IO INFO");
      console.log("--------------");
      console.log("this.collaborators:");
      console.log(JSON.parse(JSON.stringify(this.collaborators)));
      console.log("this.collaboratorsAnnotations:");
      console.log(JSON.parse(JSON.stringify(this.collaboratorsAnnotations)));
      
      // Send this User's annotations to the 'newUser'
      this.socket.emit('onlineCollaborators', [result[0], this.annotationService.annotations]);    // [newUser, this.annotationService.annotations]
    });





    // 1.2.8
    // -- Wenn eine Person den Raum verlässt
    this.socket.on('changeRoom', result => {  // [socket.id(User), annotations]
       
      // delete Data of old room-member
      console.log(`Member '${result[0]}' of your Room ${this.annotationService.socketRoom} changed the Socket-Room`);     
      console.log(`Delete his/her information's in this Room!`)
      
      // delete user from collaborators
      let userCounter = 0;
      for (const collaborator of this.collaborators){
        if (collaborator === result[0]){
          this.collaborators.splice(userCounter, 1);
        }
        userCounter++;
      }


      // !!!
      // 
      // CHANGE ROOM EMIT -- BEFORE MODEL CHANGE -- OR IN WHAT WAY TO TRANSMIT THE ANNOTATIONS OF THE OLD ROOM-MEMBER (TO OLD ROOM AT FIRST)
      // 
      // !!!

      // delete his/her annotations from collaboratorsAnnotations
      for (const changeRoomAnnotation of result[1]){
        let i = 0;
        for (const collaboratorsAnnotation of this.collaboratorsAnnotations){
          if (collaboratorsAnnotation._id === changeRoomAnnotation._id){
              this.collaboratorsAnnotations.splice(i, 1);
              // console.log(`Deletet Annotation '${logoutAnnotation._id}' of User '${result[0]}' from this.collaboratorsAnnotations`);     
          }
          i++;
        }
      }

      console.log("SOCKET.IO INFO");
      console.log("--------------");
      console.log("this.collaborators:");
      console.log(JSON.parse(JSON.stringify(this.collaborators)));
      console.log("this.collaboratorsAnnotations");
      console.log(JSON.parse(JSON.stringify(this.collaboratorsAnnotations)));
    });




    // 1.2.6.2
    this.socket.on('logout', result => { // socket.id

      console.log(`You are logging out from Socket.io ...`); 
      this.socket.disconnect();
      console.log(`DISCONNECTED FROM SOCKET.IO`);
    }); 


    // 1.2.7.2
    this.socket.on('myNewRoom', result => { // newSocketRoom

      console.log(`LEFT ROOM: ${result[0]}'`); 
      console.log(`JOINING ROOM: ${result[1]}'...`); 
    }); 

  }


  // 1.1.5
  // -- Mit Socket Verbinden
  public async loginToSocket(){
    this.annotationService.inSocket = true; 
    this.socket.connect(); 
    console.log(`LOGGED TO SOCKET.IO \n To Room '${this.annotationService.socketRoom}'`);
    // emit "you" as newUser to other online members of your current room  
    this.socket.emit('newUser', [this.annotationService.socketRoom, this.annotationService.annotations]);
  }


  // 1.1.6
  // -- Verbindung trennen (Socket)
  public async disconnectSocket(){
    
    this.annotationService.inSocket = false; 
    this.collaborators = [];
    this.collaboratorsAnnotations = [];

    // send info to other Room members
    // then
    // emit 'logout' from Socket.id for this User 
    await this.socket.emit('lostConnection', [this.annotationService.socketRoom, this.annotationService.annotations]);
  }


  // 1.1.7
  // -- Wenn eine Person den Raum verlässt
  public async changeSocketRoom(oldSocketRoom){
      
      this.collaborators = [];
      this.collaboratorsAnnotations = [];
      this.socket.emit('changeRoom', [oldSocketRoom, this.annotationService.socketRoom, this.annotationService.annotations]);
  }
}
