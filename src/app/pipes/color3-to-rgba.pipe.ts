import { Pipe, PipeTransform } from '@angular/core';
import { Color3, Color4 } from '@babylonjs/core';
import { RGBA } from 'ngx-color';

@Pipe({
  name: 'colorToRgba',
})
export class ColorToRgbaPipe implements PipeTransform {
  transform(value: Color3 | Color4): RGBA {
    return { r: value.r, g: value.g, b: value.b, a: value instanceof Color3 ? 1 : value.a };
  }
}
