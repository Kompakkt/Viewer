import { AfterViewInit, Component, ElementRef, HostListener, Input, ViewChild } from '@angular/core';
import { BabylonService } from '../../services/babylon/babylon.service';

@Component({
  selector: 'app-scene',
  templateUrl: './scene.component.html',
  styleUrls: ['./scene.component.css']
})
export class SceneComponent implements AfterViewInit {

  @ViewChild('canvas') private canvasRef: ElementRef;

  @HostListener('window:resize', ['$event'])

  public onResize(event) {
    this.babylonService.resize();
  }

  constructor(private babylonService: BabylonService) {
  }

  ngAfterViewInit() {
    this.babylonService.updateCanvas(this.canvasRef.nativeElement);
  }
}
