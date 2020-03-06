import { Component, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-render-canvas',
  templateUrl: './render-canvas.component.html',
  styleUrls: ['./render-canvas.component.scss'],
})
export class RenderCanvasComponent {
  @ViewChild('renderCanvas', { read: ElementRef })
  public canvasRef: ElementRef<HTMLCanvasElement> = new ElementRef<
    HTMLCanvasElement
  >(document.createElement('canvas'));
}
