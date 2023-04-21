import { Pipe, PipeTransform } from '@angular/core';
import { Color4 } from '@babylonjs/core';

@Pipe({
  name: 'colorToRgba',
})
export class ColorToRgbaPipe implements PipeTransform {
  transform({ r, g, b, a }: Color4, fixedAlpha?: number): string {
    return `rgba(${r},${g},${b},${fixedAlpha ?? a})`;
  }
}
