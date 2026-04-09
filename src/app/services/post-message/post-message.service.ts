import { Injectable } from '@angular/core';
import { fromEvent } from 'rxjs';

type Message<T> = { type: string; data: T };
const isMessage = (message: unknown): message is Message<unknown> => {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    'data' in message &&
    typeof message.data === 'object' &&
    typeof message.type === 'string'
  );
};

@Injectable({ providedIn: 'root' })
export class PostMessageService {
  constructor() {
    fromEvent(window, 'message').subscribe(event => {
      if (event instanceof MessageEvent) this.handleMessage(event);
    });
  }

  get hasParent() {
    return !!window.top;
  }
  public sendToParent<T>(message: Message<T>) {
    if (!this.hasParent) return;
    window.top?.postMessage(message, '*');
  }

  private handleMessage(event: MessageEvent) {
    const message = event.data;
    if (!isMessage(message)) return;
    console.log('Got message', message);
  }
}
