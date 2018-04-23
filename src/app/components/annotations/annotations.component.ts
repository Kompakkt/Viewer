import {Component, OnInit} from '@angular/core';
import * as BABYLON from 'babylonjs';
import * as GUI from 'babylonjs-gui';


@Component({
  selector: 'app-annotations',
  templateUrl: './annotations.component.html',
  styleUrls: ['./annotations.component.css']
})
export class AnnotationsComponent implements OnInit {


  public createAnnotations(scene: BABYLON.Scene, canvas: HTMLCanvasElement) {
    /*
    const advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI('UI');


    const mousePickModel = function (unit_mesh) {
      console.log('mouse picks ' + unit_mesh.meshUnderPointer.id);
      console.log(unit_mesh);
      if (unit_mesh.source !== null) {
        const pickResult = scene.pick(scene.pointerX, scene.pointerY, null, false, camera);

        if (pickResult.pickedMesh) {
          const target = new GUI.Ellipse();
          target.width = '30px';
          target.height = '30px';
          target.color = 'White';
          target.thickness = 1;
          target.background = 'black';
          advancedTexture.addControl(target);
          target.moveToVector3(new BABYLON.Vector3(pickResult.pickedPoint.x, pickResult.pickedPoint.y, pickResult.pickedPoint.z), scene);
          //target.linkWithMesh(sphere);
          //target.showBoundingBox = true;
          target.onPointerDownObservable.add(function () {
            alert('works');
            //target.isPickable = true;
          });
          const label = new GUI.TextBlock();
          label.text = '1';
          target.addControl(label);

        }
      }
    };

    const sphere = BABYLON.Mesh.CreateSphere('sphere1', 16, 2, scene);
    const action4 = new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnDoublePickTrigger, mousePickModel);
    sphere.actionManager = new BABYLON.ActionManager(scene);
    sphere.actionManager.registerAction(action4);


        const advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI('UI');


            //When pointer down event is raised
            scene.onPointerDown = function (evt, pickResult) {
              // if the click hits the ground object, we change the impact position
              if (pickResult.hit) {

                const target = new GUI.Ellipse();
                target.width = '30px';
                target.height = '30px';
                target.color = 'White';
                target.thickness = 1;
                target.background = 'black';
                advancedTexture.addControl(target);
                target.moveToVector3(new BABYLON.Vector3(pickResult.pickedPoint.x, pickResult.pickedPoint.y, 0), scene);
                //target.linkWithMesh(sphere);
                //target.showBoundingBox = true;
                target.onPointerDownObservable.add(function () {
                  alert('works');
                  //target.isPickable = true;
                });
                const label = new GUI.TextBlock();
                label.text = '1';
                target.addControl(label);

              }
            };

               mesh.actionManager
                .registerAction(
                    new BABYLON.InterpolateValueAction(
                        BABYLON.ActionManager.OnPickTrigger,
                        mesh,
                        'visibility',
                        0.2,
                        1000
                    )
                )
                .then(
                    new BABYLON.InterpolateValueAction(
                        BABYLON.ActionManager.OnPickTrigger,
                        mesh,
                        'visibility',
                        1.0,
                        1000
                    )
                );
          const meshDistance = BABYLON.Vector3.Distance(camera.position, mesh.position);
          const spriteDistance = camera.position.distanceTo(camera.position, target.position);
          const spriteBehindObject = spriteDistance > meshDistance;

          target.material.alpha = spriteBehindObject ? 0.25 : 1;

        //DOppelklick
        mesh.actionManager = new BABYLON.ActionManager(scene);

               BABYLON.ActionManager.OnDoublePickTrigger
               BABYLON.ExecuteCodeAction(trigger, func, condition): Executes code.


        var process = function (e) {
                var currentMesh;

                var pickinfo = scene.pick(scene.pointerX, scene.pointerY, function (mesh) { return mesh != ground && mesh != skybox });

                if (pickinfo.hit) {
                    currentMesh = pickinfo.pickedMesh;
                }

                if (!currentMesh) return;
                console.log(currentMesh);

                // explosion(box1);
                explosion(currentMesh);
                setInterval( reducer(currentMesh), 200 );

                return false;
            };

            var reducer = function (mesh) {
                mesh.visibility -= .1;
            };

            canvas.addEventListener("dblclick", process);

            var explosion = function(mesh){
                particleSystem.emitter = mesh;
                particleSystem.manualEmitCount = 1500;
            }

            scene.onDispose = function () {
                canvas.removeEventListener("dblclick", process);
            };

        */

  }

  constructor() {
  }

  ngOnInit() {
  }

}
