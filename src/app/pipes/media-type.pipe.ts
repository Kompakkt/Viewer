import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'mediaType',
})
export class MediaTypePipe implements PipeTransform {

  // cases: model, image, audio, video, text
  transform(items: any[], model: boolean, image: boolean,
            audio: boolean, video: boolean, text: boolean): any[] {
    if (!items) return [];
    const response: string[] = [];

    items.forEach(item => {

      if (item.mediaType) {
        switch (item.mediaType) {
          case 'model':
            if (model) {
              response.push(item);
            }
            break;
          case 'image':
            if (image) {
              response.push(item);
            }
            break;
          case 'audio':
            if (audio) {
              response.push(item);
            }
            break;
          case 'video':
            if (video) {
              response.push(item);
            }
            break;
          case 'text':
            if (text) {
              response.push(item);
            }
            break;
          default:
            console.log('undefined');

        }
      }
    });
    return response;

  }
}
