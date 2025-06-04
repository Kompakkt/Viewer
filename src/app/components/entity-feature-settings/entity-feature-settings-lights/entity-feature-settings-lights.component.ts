import { AfterViewInit, Component, signal } from '@angular/core';
import { firstValueFrom, Subject, throttleTime } from 'rxjs';

import { TranslatePipe } from '../../../pipes/translate.pipe';
import { EntitySettingsService } from '../../../services/entitysettings/entitysettings.service';
import { ProcessingService } from '../../../services/processing/processing.service';

import {
  ButtonComponent,
  InputComponent,
  SliderComponent,
  LabelledCheckboxComponent,
  ButtonRowComponent,
  MenuComponent,
  MenuOptionComponent,
} from 'komponents';
import { BabylonService } from 'src/app/services/babylon/babylon.service';
import {
  Color3,
  CreateCylinder,
  CreateSphere,
  GizmoManager,
  Light,
  LightGizmo,
  Mesh,
  PointLight,
  Quaternion,
  SpotLight,
  StandardMaterial,
  TransformNode,
  UtilityLayerRenderer,
  Vector3,
} from '@babylonjs/core';
import { IEntityLight } from 'src/common';
import { MatIconModule } from '@angular/material/icon';
import { createLight } from 'src/app/helpers/light-helper';
import { IsInstanceOfPipe } from 'src/app/pipes/instance-of.pipe';
import { ColorChromeModule } from 'ngx-color/chrome';
import { RGBA } from 'ngx-color';
import { ColorToRgbaPipe } from 'src/app/pipes/color3-to-rgba.pipe';
import { SplitClassNamePipe } from 'src/app/pipes/split-class-name.pipe';

type SceneLight = {
  type: IEntityLight['type'];
  id: string;
  light: Light;
};

@Component({
  selector: 'app-entity-feature-settings-lights',
  templateUrl: './entity-feature-settings-lights.component.html',
  styleUrls: ['./entity-feature-settings-lights.component.scss'],
  imports: [
    TranslatePipe,
    SliderComponent,
    InputComponent,
    MatIconModule,
    MenuComponent,
    MenuOptionComponent,
    ButtonComponent,
    ButtonRowComponent,
    LabelledCheckboxComponent,
    IsInstanceOfPipe,
    ColorChromeModule,
    ColorToRgbaPipe,
    SplitClassNamePipe,
  ],
})
export class EntityFeatureSettingsLightsComponent implements AfterViewInit {
  sceneLights = signal<SceneLight[]>([]);
  selectedSceneLight = signal<SceneLight | null>(null);

  lightGizmo?: LightGizmo;
  gizmoManager?: GizmoManager;

  lightDirectionIndicator?: Mesh | TransformNode;
  lightDirectionIndicatorMaterial: StandardMaterial = (() => {
    const material = new StandardMaterial(
      `light_direction_indicator_material`,
      this.babylon.getScene(),
    );
    material.diffuseColor = Color3.White();
    material.alpha = 0.2;
    material.wireframe = true;
    return material;
  })();

  #indicatorUpdateTrigger$ = new Subject<void>();

  public SpotLight = SpotLight;
  public Math = Math;

  constructor(
    public entitySettings: EntitySettingsService,
    private processing: ProcessingService,
    private babylon: BabylonService,
  ) {}

  #createGizmos() {
    this.lightGizmo?.dispose();
    this.gizmoManager?.dispose();

    const scene = this.babylon.getScene();
    const utilityLayerRenderer = new UtilityLayerRenderer(scene);
    const lightGizmo = new LightGizmo(utilityLayerRenderer);
    const gizmoManager = new GizmoManager(scene, 1, utilityLayerRenderer);

    gizmoManager.usePointerToAttachGizmos = false;
    gizmoManager.positionGizmoEnabled = true;
    gizmoManager.rotationGizmoEnabled = true;

    gizmoManager.gizmos.positionGizmo?.onDragStartObservable.add(() => {
      this.#indicatorUpdateTrigger$.next();
    });

    gizmoManager.gizmos.rotationGizmo?.onDragStartObservable.add(() => {
      this.#indicatorUpdateTrigger$.next();
    });

    gizmoManager.gizmos.rotationGizmo?.onDragEndObservable.add(() => {
      this.#indicatorUpdateTrigger$.next();
    });

    gizmoManager.gizmos.rotationGizmo?.onDragEndObservable.add(() => {
      this.#indicatorUpdateTrigger$.next();
    });

    this.lightGizmo = lightGizmo;
    this.gizmoManager = gizmoManager;

    return { gizmoManager, lightGizmo };
  }

  ngAfterViewInit(): void {
    this.#createGizmos();

    (window as any).gizmoManager = () => this.gizmoManager;

    const subscription = this.entitySettings.areSettingsLoaded$.subscribe(areSettingsLoaded => {
      if (areSettingsLoaded) {
        this.#updateSceneLights();
        subscription.unsubscribe();
      }
    });

    this.#indicatorUpdateTrigger$.pipe(throttleTime(16)).subscribe(() => {
      const selectedLight = this.selectedSceneLight();
      if (selectedLight) {
        this.#updateDirectionIndicator(selectedLight);
      }
    });
  }

  #updateSceneLights() {
    this.sceneLights.set(
      this.babylon.getScene().lights.map(light => ({
        type: light.getClassName() as IEntityLight['type'],
        id: light.id,
        light,
      })),
    );
  }

  async #updateDirectionIndicator(light: SceneLight) {
    const scene = this.babylon.getScene();
    const tessellation = 32;
    const meshes = await firstValueFrom(this.processing.meshes$);

    const range =
      Math.max(
        ...meshes
          .filter(m => m.isEnabled())
          .filter(m => m.getBoundingInfo().boundingSphere.radiusWorld !== 0)
          .map(m => m.getBoundingInfo().boundingSphere.radiusWorld),
      ) * 2;

    // const range = Vector3.Distance(light.light.getAbsolutePosition(), Vector3.Zero());

    console.log('updateDirectionIndicator', meshes, range, light.light.diffuse);

    this.lightDirectionIndicator?.dispose();

    const [indicator, offset] = (() => {
      switch (light.type) {
        case 'SpotLight': {
          const spotLight = light.light as SpotLight;

          // Calculate the diameter at the base of the cone using trigonometry
          // diameter = 2 * height * tan(angle/2)
          const coneRadius = range * Math.tan(spotLight.angle / 2);
          const coneDiameter = coneRadius * 2;

          const cone = CreateCylinder(
            `light_direction_indicator_cone`,
            {
              height: range,
              diameterTop: coneDiameter,
              diameterBottom: 0,
              tessellation,
              updatable: true,
            },
            scene,
          );
          cone.renderingGroupId = 2;

          const transformNode = new TransformNode(`light_direction_indicator_transform`, scene);
          cone.setParent(transformNode);
          cone.position.y += range / 2;

          // The cone points up by default (0, 1, 0), so we need to calculate the rotation from (0, 1, 0) towards the spotlight direction
          const defaultConeDirection = Vector3.Up();
          const targetDirection = spotLight.direction.normalizeToNew();

          const rotationQuaternion = Quaternion.FromUnitVectorsToRef(
            defaultConeDirection,
            targetDirection,
            new Quaternion(),
          );

          transformNode.rotationQuaternion = rotationQuaternion;

          cone.material = this.lightDirectionIndicatorMaterial;

          return [transformNode, range / 2];
        }
        case 'PointLight': {
          return [
            CreateSphere(
              `light_direction_indicator_sphere`,
              {
                diameter: (light.light as PointLight).intensity * 0.1,
                segments: tessellation,
                updatable: true,
              },
              scene,
            ),
            ((light.light as PointLight).intensity * 0.1) / 2,
          ];
        }
        case 'DirectionalLight': {
          return [
            CreateCylinder(
              `light_direction_indicator_cylinder`,
              {
                height: range,
                diameterTop: 0,
                diameterBottom: 0,
                tessellation,
                updatable: true,
              },
              scene,
            ),
            range / 2,
          ];
        }
        case 'HemisphericLight': {
          return [
            CreateCylinder(
              `light_direction_indicator_cylinder`,
              {
                height: range,
                diameterTop: 0,
                diameterBottom: 0,
                tessellation,
                updatable: true,
              },
              scene,
            ),
            range / 2,
          ];
        }
      }
    })();

    this.lightDirectionIndicatorMaterial.emissiveColor = light.light.diffuse.clone();
    indicator.position = light.light.getAbsolutePosition().clone();
    // indicator.position.y += offset;
    indicator.setParent(light.light);

    this.lightDirectionIndicator = indicator;
  }

  selectLight(light: SceneLight) {
    if (!this.lightGizmo || !this.gizmoManager) {
      this.#createGizmos();
    }
    this.lightGizmo!.light = light.light;
    this.gizmoManager!.attachToMesh(this.lightGizmo!.attachedMesh);

    this.#updateDirectionIndicator(light);
    this.selectedSceneLight.set(light);
  }

  addLight(type: IEntityLight['type']) {
    const scene = this.babylon.getScene();
    const light = createLight({ type }, scene);
    console.log('Added light to scene', light);

    this.#updateSceneLights();
  }

  removeLight(light: SceneLight) {
    const scene = this.babylon.getScene();
    scene.removeLight(light.light);
    this.#updateSceneLights();
    if (this.selectedSceneLight()?.id === light.id) {
      this.selectedSceneLight.set(null);
      this.lightDirectionIndicator?.dispose();
      this.#createGizmos();
    }
  }

  setLightColor({ light }: SceneLight, rgba: RGBA) {
    console.log(rgba);
    light.diffuse = new Color3(rgba.r, rgba.g, rgba.b);
  }
}
