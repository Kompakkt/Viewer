import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'pointCloudNumber' })
export class FluentPipe implements PipeTransform {
  transform(value: number): string {
    return value.toLocaleString('en-US').replaceAll(',', ' ');
  }
}
