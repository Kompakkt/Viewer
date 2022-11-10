import { Injectable } from '@angular/core';
import {
  AbstractMesh,
  Color3,
  Mesh,
  MeshBuilder,
  Nullable,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock } from '@babylonjs/gui';
import { BehaviorSubject, map, combineLatest, firstValueFrom } from 'rxjs';
import { BabylonService } from '../babylon/babylon.service';
import { ProcessingService } from '../processing/processing.service';

export type ReferenceUnit = 'mm' | 'cm' | 'm';

export interface Measurement {
  from: Vector3;
  to: Vector3;
  length: number;
  unit: ReferenceUnit;
}

@Injectable({
  providedIn: 'root',
})
export class MeasurementService {
  private sliceLength = new BehaviorSubject(2);
  public sliceLength$ = this.sliceLength.asObservable();

  private measurement = new BehaviorSubject<Measurement | undefined>(undefined);
  public measurement$ = this.measurement.asObservable();

  private pickedPoints = new BehaviorSubject<Vector3[]>([]);
  public pickedPoints$ = this.pickedPoints.asObservable();

  private pointToPick = new BehaviorSubject<number | undefined>(undefined);
  public pointToPick$ = this.pointToPick.asObservable();

  private maxExtend = new BehaviorSubject<number>(0);

  constructor(private babylon: BabylonService, private processing: ProcessingService) {
    const mat = new StandardMaterial(`mat_unlit_measurement`);
    mat.disableLighting = true;
    mat.emissiveColor = new Color3(0, 0, 0);

    this.processing.meshes$.subscribe(meshes => {
      const bounds = meshes.map(mesh => mesh.getBoundingInfo().boundingBox.extendSizeWorld);
      const max = Math.max(...bounds.flatMap(v => [v.x, v.y, v.z]));
      this.maxExtend.next(max);
    });

    this.babylon.getCanvas().addEventListener('dblclick', () => {
      const pointToPick = this.pointToPick.getValue();
      if (pointToPick === undefined) return;

      const scene = this.babylon.getScene();
      const result = scene.pick(scene.pointerX, scene.pointerY, mesh => mesh.isVisible);
      if (!result || !result.pickedPoint) return;

      const points = this.pickedPoints.getValue();
      points[pointToPick] = result.pickedPoint;
      this.pickedPoints.next(points);
    });

    this.slice$.subscribe(arr => {
      const [from, to] = arr.slice(-2);

      const size = this.maxExtend.getValue() / 200;
      // Cleanup
      let mesh: Nullable<AbstractMesh>;

      ['measurement_sphere', 'measurement_tube'].forEach(name => {
        while ((mesh = this.babylon.getScene().getMeshByName(name)))
          this.babylon.getScene().removeMesh(mesh);
      });
      // Create Starting Sphere (if tube not completable)
      if (from) {
        const sphere = MeshBuilder.CreateSphere('measurement_sphere', { diameter: size * 2 });
        sphere.position = from;
        sphere.material = mat;
        sphere.renderingGroupId = 3;
      }
      if (to) {
        const sphere = MeshBuilder.CreateSphere('measurement_sphere', { diameter: size * 2 });
        sphere.position = to;
        sphere.material = mat;
        sphere.renderingGroupId = 3;
      }
      // Create Tube (if possible)
      if (from && to) {
        const line = MeshBuilder.CreateTube('measurement_tube', {
          radius: size * 0.5,
          path: [from, to],
          cap: Mesh.CAP_ALL,
        });
        line.material = mat;
        line.renderingGroupId = 3;
      }
    });

    this.measurement$.subscribe(async measurement => {
      if (!measurement) return;
      console.log('Measurement', measurement);
      const { from, to, length, unit } = measurement;
      const distance = Vector3.Distance(from, to);
      const worldUnit = length / distance;
      console.log(`1 unit in 3D is equal to ${worldUnit} ${unit}`);
      const maxExtend = this.maxExtend.getValue();
      const radius = maxExtend / 200;

      const meshes = await firstValueFrom(this.processing.meshes$);
      for (const mesh of meshes) {
        const vectors = mesh.getBoundingInfo().boundingBox.vectorsWorld;
        // mesh.showBoundingBox = true;

        const blb = vectors[4];
        const flb = vectors[0];
        const blt = vectors[6];
        const brb = vectors[7];

        const paths = {
          z_axis: [blb, flb],
          x_axis: [blb, brb],
          y_axis: [blb, blt],
        };

        Object.entries(paths).forEach(([axis, path]) => {
          const line = MeshBuilder.CreateTube(`ruler_tube_${axis}`, {
            radius,
            path,
            cap: Mesh.CAP_ALL,
          });
          line.material = mat;
          line.renderingGroupId = 2;

          const plane = MeshBuilder.CreatePlane(`ruler_text_${axis}`, {
            size: maxExtend,
          });
          switch (axis.split('_')[0]) {
            case 'x':
              plane.position = path[1].multiply(new Vector3(0.5, 1, 1));

              break;
            case 'y':
              plane.position = path[1].multiply(new Vector3(1, 0.5, 1));

              break;
            case 'z':
              plane.position = path[1].multiply(new Vector3(1, 1, 0.5));

              break;
          }
          plane.renderingGroupId = 2;
          const texture = AdvancedDynamicTexture.CreateForMesh(plane);

          const dist = Vector3.Distance(path[0], path[1]);
          const text = new TextBlock(
            `ruler_textblock_${axis}`,
            `${(dist * worldUnit).toFixed(2)} ${unit}`,
          );
          text.resizeToFit = true;
          text.color = 'white';
          text.fontSize = 50;
          text.width = 1;
          text.height = 1;
          texture.addControl(text);
        });
      }
    });
  }

  get slice$() {
    return combineLatest([this.sliceLength$, this.pickedPoints$]).pipe(
      map(([length, points]) => points.slice(length * -1)),
    );
  }

  public setPointToPick(index: number) {
    this.pointToPick.next(index);
  }

  public saveMeasurement(data: { length: number; unit: ReferenceUnit }) {
    const points = this.pickedPoints.getValue().slice(-2);
    if (points.length !== 2) return;
    const [from, to] = points;
    const { length, unit } = data;
    const measurement: Measurement = { from, to, length, unit };
    this.measurement.next(measurement);
  }
}
