import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'mediaType',
})
export class MediaTypePipe implements PipeTransform {

  transform(value: string, args?: any): string {
    if (value) {
      return this.checkMediatype(value);
    } else {
      return 'unknown';
    }
  }

  public checkMediatype(path: string): string {
    const fileExt = path.split('.').pop();
    switch (fileExt) {
      case 'babylon':
        return '3D Model';
      case 'jpg':
      case 'png':
        return 'Image';
      default:
        return 'unknown';
    }
  }

}
