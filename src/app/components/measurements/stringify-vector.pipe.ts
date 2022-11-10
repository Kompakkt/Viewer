import { Pipe, PipeTransform } from '@angular/core';
import { Vector3 } from '@babylonjs/core';

@Pipe({
  name: 'stringifyVector',
})
export class StringifyVectorPipe implements PipeTransform {
  transform(value: Vector3): string {
    const { x, y, z } = value;
    return `X: ${x.toFixed(2)} | Y: ${y.toFixed(2)} | Z: ${z.toFixed(2)}`;
  }
}
