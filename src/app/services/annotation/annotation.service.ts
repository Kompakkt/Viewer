import {Injectable} from '@angular/core';

import * as BABYLON from 'babylonjs';
import * as GUI from 'babylonjs-gui';

import {BabylonService} from '../babylon/babylon.service';

@Injectable({
  providedIn: 'root'
})
export class AnnotationService {

  private canvas: HTMLCanvasElement;
  private annotationCounter = 0;

  constructor(private babylonService: BabylonService) {
  }

  // load existing annotations (get data) -> draw labels
  // make modell pickable via doubleclick -> add json data, pass to annotation component and draw label
  // delete label

  private mousePickModel(unit_mesh: any) {

    if (unit_mesh.source !== null) {

      const scene = this.babylonService.getScene();
      const pickResult = scene.pick(scene.pointerX, scene.pointerY,
        null, false, scene.activeCamera);

      if (pickResult.pickedMesh) {

        const pickResultVector = new BABYLON.Vector3(pickResult.pickedPoint.x, pickResult.pickedPoint.y, pickResult.pickedPoint.z);
        const normal = pickResult.getNormal(true, true);

        this.createNewAnnotation(pickResultVector, normal);
      }
    }
  }

  public pickableModel(name: string, pickable: boolean) {

    const scene = this.babylonService.getScene();
    const mesh = scene.getMeshByName(name);

    if (mesh != null) {

      mesh.actionManager = new BABYLON.ActionManager(scene);

      if (pickable) {

        const that = this;

        mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
          BABYLON.ActionManager.OnDoublePickTrigger, function (evt) {
            that.mousePickModel(evt);
          }));
      } else {

        if (mesh.actionManager.hasPickTriggers) {
          for (let i = mesh.actionManager.actions.length - 1; i >= 0; i--) {
            mesh.actionManager.actions.splice(i, 1);
          }
        }
      }
    }
  }

  public createNewAnnotation(position: BABYLON.Vector3, normal: BABYLON.Vector3) {

    const precedence = this.annotationCounter;
    this.createAnnotationLabel(position, normal, precedence);
  }

  public createAnnotationLabel(position: BABYLON.Vector3, normal: BABYLON.Vector3, precedence: number) {

    this.annotationCounter++;

    // two Labels: one is for isOccluded true, one for false -> alpha 0.5 for transparancy
    this.createGeometryForLabel('plane', 'label', true, 1, 0, position, normal);
    this.createGeometryForLabel('planeup', 'labelup', true, 0.5, 1, position, normal);
  }

  private onMarkerClicked() {

    // Kameraposition einnehmen
    // HTML Textbox anzeigen
    alert('works now');
    // that.updateScreenPosition();

    /*
  *
  * Dann kann diese auch onclick leuchten
  * Dafür die 3D engine in Scene so laden:
  * this.engine = new BABYLON.Engine(this.canvas, true, { stencil: true });
  * Add the highlight layer.
  * var hl = new BABYLON.HighlightLayer("hl1", scene);
  * hl.addMesh(plane, BABYLON.Color3.Green());
  * hl.removeMesh(plane);
  */
  }

  private createGeometryForLabel(namePlane: string, nameLabel: string, clickable: boolean,
                                 alpha: number, renderingGroup: number, position: BABYLON.Vector3,
                                 normal: BABYLON.Vector3) {

    const plane = BABYLON.MeshBuilder.CreatePlane(namePlane + '_' + String(this.annotationCounter),
      {height: 1, width: 1}, this.babylonService.getScene());

    BABYLON.Tags.AddTagsTo(plane, namePlane);

    plane.position = new BABYLON.Vector3(position.x, position.y, position.z);
    plane.translate(normal, 1, BABYLON.Space.WORLD);
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

    const advancedTexturePlane = GUI.AdvancedDynamicTexture.CreateForMesh(plane);

    const label = new GUI.Ellipse(nameLabel + '_' + String(this.annotationCounter));
    label.width = '100%';
    label.height = '100%';
    label.color = 'White';
    label.thickness = 1;
    label.background = 'black';
    label.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;

    advancedTexturePlane.addControl(label);

    if (clickable) {
      label.onPointerDownObservable.add(this.onMarkerClicked);
    }

    const number = new GUI.TextBlock();
    number.text = String(this.annotationCounter);
    number.color = 'white';
    number.fontSize = 1000;
    number.width = '2000px';
    number.height = '2000px';

    label.addControl(number);

    plane.material.alpha = alpha;
    // TODO: click is not working if renderingGroup = 1 and Object is behind another object
    plane.renderingGroupId = renderingGroup;
  }


  // Onclick
  // Position einnehmen (erstmal perfekte Sicht auf die Annotation)
  // HTML Box anzeigen (visible)

  private updateScreenPosition() {

    const annotation = <HTMLElement>document.querySelector('.annotation');
    const vector = this.babylonService.getScene().getMeshByName('plane_1').getBoundingInfo().boundingBox.centerWorld;

    vector.x = Math.round((0.5 + vector.x / 2) * (this.canvas.width / window.devicePixelRatio));
    vector.y = Math.round((0.5 - vector.y / 2) * (this.canvas.height / window.devicePixelRatio));

    annotation.style.top = vector.y + 'px';
    annotation.style.left = vector.x + 'px';
  }

// Delete Annotation
}
