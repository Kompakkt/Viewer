import {Component, OnInit} from '@angular/core';
import * as BABYLON from 'babylonjs';
import * as GUI from 'babylonjs-gui';


@Component({
  selector: 'app-annotations',
  templateUrl: './annotations.component.html',
  styleUrls: ['./annotations.component.css']
})
export class AnnotationsComponent implements OnInit {

  private canvas: HTMLCanvasElement;
  private scene: BABYLON.Scene;
  private mesh: BABYLON.Mesh;
  private annotationCounter: number;


  constructor() {
  }

  public createAnnotations(scene: BABYLON.Scene, canvas: HTMLCanvasElement) {

    this.scene = scene;
    this.canvas = canvas;
    this.annotationCounter = 0;

    // Please refactor me, I'm as ugly as a german folk musician!!!11!!!1!
    const that = this;

    // Bei Doppelklick auf ein Modell
    const mousePickModel = function (unit_mesh: any) {
      console.log('mouse picks ' + unit_mesh.meshUnderPointer.id);
      console.log(unit_mesh);
      if (unit_mesh.source !== null) {
        const pickResult = scene.pick(scene.pointerX, scene.pointerY, null, false, this.camera);

        if (pickResult.pickedMesh) {
          const pickResultVector = new BABYLON.Vector3(pickResult.pickedPoint.x, pickResult.pickedPoint.y, pickResult.pickedPoint.z);

          // Please refactor me, please!
          that.createAnnotationLabel(pickResultVector);
        }
      }
    };
    //const mesh = this.scene.getMeshByName('Texture_0');
    // Doppelklick auf Modell, bekommt eine Funktion
    this.mesh = BABYLON.Mesh.CreateBox('box1', 4, this.scene);


    const action = new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnDoublePickTrigger, mousePickModel);
    this.mesh.actionManager = new BABYLON.ActionManager(this.scene);
    this.mesh.actionManager.registerAction(action);

  }

  ngOnInit() {
  }

  public createAnnotationLabel(position: BABYLON.Vector3) {
    // Please refactor me, I'm as ugly as a german folk musician!!!11!!!1!
    const that = this;
    this.annotationCounter++;
    const plane = BABYLON.MeshBuilder.CreatePlane('plane_' + String(this.annotationCounter), {height: 1, width: 1}, this.scene);
    BABYLON.Tags.AddTagsTo(plane, 'plane');
    plane.position = new BABYLON.Vector3(position.x, position.y, position.z);
    // plane.material.diffuseTexture.hasAlpha = true;
    // alpha = 0.0;
    plane.showBoundingBox = true;
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    //  this.mesh.getBoundingInfo()._update(BABYLON.Matrix.Scaling(bbsize));
    // plane._updateNonUniformScalingState(false);
    const advancedTexturePlane = GUI.AdvancedDynamicTexture.CreateForMesh(plane);

    const label = new GUI.Ellipse('label_' + String(this.annotationCounter));
    label.width = '100%';
    label.height = '100%';
    label.color = 'White';
    label.thickness = 1;
    label.background = 'black';
    label.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    advancedTexturePlane.addControl(label);
    label.onPointerDownObservable.add(function () {
      // Kameraposition einnehmen
      // HTML Textbox anzeigen
      alert('works');
      //that.updateScreenPosition();

    });
    const number = new GUI.TextBlock();
    number.text = String(this.annotationCounter);
    number.color = 'white';
    number.fontSize = 1000;

    number.width = '2000px';
    number.height = '2000px';
    label.addControl(number);
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


  // HTML Textbox anzeigen (onklick) und ausblenden, sobald eine neue Navigation ausgeführt wird

  private updateScreenPosition() {


    const annotation = <HTMLElement>document.querySelector('.annotation');
    const vector = this.scene.getMeshByName('plane_1').getBoundingInfo().boundingBox.centerWorld;

    vector.x = Math.round((0.5 + vector.x / 2) * (this.canvas.width / window.devicePixelRatio));
    vector.y = Math.round((0.5 - vector.y / 2) * (this.canvas.height / window.devicePixelRatio));

    annotation.style.top = vector.y + 'px';
    annotation.style.left = vector.x + 'px';

  }


  /*
      Annotation befindet sich hinter dem Mesh und soll transparent werden / Momentan Bounding Box, evt. diese Stylen


             const meshDistance = BABYLON.Vector3.Distance(camera.position, mesh.position);
             const spriteDistance = camera.position.distanceTo(camera.position, target.position);
             const spriteBehindObject = spriteDistance > meshDistance;

             target.material.alpha = spriteBehindObject ? 0.25 : 1;

             alpha wert
               var reducer = function (mesh) {
                   mesh.visibility -= .1;
               };


           */

  // Delete Annotation



}

