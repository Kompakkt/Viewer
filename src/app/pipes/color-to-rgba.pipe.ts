import { Pipe, PipeTransform } from '@angular/core';
import { Color4 } from '@babylonjs/core';
import { IColor } from '~common/interfaces';

@Pipe({
  name: 'colorToRgba',
})
export class ColorToRgbaPipe implements PipeTransform {
  transform({ r, g, b, a }: Color4 | IColor, fixedAlpha?: number): string {
    return `rgba(${r},${g},${b},${fixedAlpha ?? a})`;
  }
}
