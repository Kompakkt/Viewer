import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'asAbsolute' })
export class AsAbsolutePipe implements PipeTransform {
  transform(value: number): number {
    return Math.abs(value);
  }
}
