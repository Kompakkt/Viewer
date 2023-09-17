import { Injectable } from '@angular/core';
import { fromEvent } from 'rxjs';
import { IEntitySettings } from '~common/interfaces';

type Message = { type: string; data: unknown; settings?: IEntitySettings };
const isMessage = (message: any): message is Message => {
  return (
    message.type &&
    message.data &&
    typeof message.data === 'object' &&
    typeof message.type === 'string'
  );
};

@Injectable({
  providedIn: 'root',
})
export class PostMessageService {
  constructor() {
    fromEvent(window, 'message').subscribe(event => {
      if (event instanceof MessageEvent) this.handleMessage(event);
    });
  }

  get hasParent() {
    return !!window.top;
  }
  public sendToParent(message: Message) {
    if (!this.hasParent) return;
    window.top?.postMessage(message, '*');
  }

  private handleMessage(event: MessageEvent) {
    const message = event.data;
    if (!isMessage(message)) return;
    console.log('Got message', message);
  }
}
