import { Component, ElementRef, viewChild, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-render-canvas',
  templateUrl: './render-canvas.component.html',
  styleUrls: ['./render-canvas.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
})
export class RenderCanvasComponent {
  public readonly canvasRef = viewChild('renderCanvas', { read: ElementRef });
}
