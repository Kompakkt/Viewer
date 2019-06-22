import { AfterViewInit, Component,  ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-render-canvas',
  templateUrl: './render-canvas.component.html',
  styleUrls: ['./render-canvas.component.scss'],
})
export class RenderCanvasComponent implements AfterViewInit {

  @ViewChild('renderCanvas', { read: ElementRef, static: false })
  public canvasRef: ElementRef<HTMLCanvasElement>;

  ngAfterViewInit() {
  }

}
