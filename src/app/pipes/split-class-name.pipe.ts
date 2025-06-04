import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'splitClassName',
})
export class SplitClassNamePipe implements PipeTransform {
  transform(value: string): string {
    // Split PascalCase class name to words
    return value
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map((word, index) => (index === 0 ? word : word.toLowerCase()))
      .join(' ');
  }
}
