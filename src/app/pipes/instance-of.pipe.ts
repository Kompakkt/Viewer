import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'isInstanceOf',
})
export class IsInstanceOfPipe implements PipeTransform {
  transform<T>(value: any, target: new (...args: any[]) => T): T | false {
    return value instanceof target ? (value as T) : false;
  }
}
