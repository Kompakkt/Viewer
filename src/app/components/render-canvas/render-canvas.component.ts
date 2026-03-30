import { Component, ElementRef, viewChild } from '@angular/core';

@Component({
  selector: 'app-render-canvas',
  templateUrl: './render-canvas.component.html',
  styleUrls: ['./render-canvas.component.scss'],
  standalone: true,
})
export class RenderCanvasComponent {
  public readonly canvasRef = viewChild('renderCanvas', { read: ElementRef });
}
