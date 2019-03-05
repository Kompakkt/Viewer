import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';

@Injectable({
  providedIn: 'root'
})
export class SocketService {

  constructor(public socket: Socket) {

    // this.socket.fromEvent('message').subscribe(result => console.log(result));
  }
}
