import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'app-annotations',
  templateUrl: './annotations.component.html',
  styleUrls: ['./annotations.component.css']
})
export class AnnotationsComponent implements OnInit {

  constructor() {
  }
/*
  private updateScreenPosition() {

    const annotation = <HTMLElement>document.querySelector('.annotation');
    const vector = this.scene.getMeshByName('plane_1').getBoundingInfo().boundingBox.centerWorld;

    vector.x = Math.round((0.5 + vector.x / 2) * (this.canvas.width / window.devicePixelRatio));
    vector.y = Math.round((0.5 - vector.y / 2) * (this.canvas.height / window.devicePixelRatio));

    annotation.style.top = vector.y + 'px';
    annotation.style.left = vector.x + 'px';

  }*/

  ngOnInit() {
  }

}
