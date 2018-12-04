import {Component, HostBinding, Input, OnInit} from '@angular/core';
import {OverlayService} from '../../services/overlay/overlay.service';
import {AnnotationService} from '../../services/annotation/annotation.service';
import {ActionService} from '../../services/action/action.service';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {BabylonService} from '../../services/babylon/babylon.service';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss']
})
export class EditorComponent implements OnInit {

  @HostBinding('class.is-open') private isOpen = false;
  @Input() modelFileName: string;

  constructor(private overlayService: OverlayService,
              private actionService: ActionService,
              private babylonService: BabylonService,
              public annotationService: AnnotationService) {
  }

  ngOnInit() {

    this.overlayService.editor.subscribe(editorIsOpen => {

      this.isOpen = editorIsOpen;
      // TODO initialize after model is loaded!
      this.babylonService.getScene().meshes.forEach(mesh => {
        this.actionService.pickableModel(mesh.name, this.isOpen);
        this.annotationService.initializeAnnotationMode(mesh.name);
      });

    });
  }

  drop(event: CdkDragDrop<string[]>) {

    moveItemInArray(this.annotationService.annotations, event.previousIndex, event.currentIndex);
    this.annotationService.changedRankingPositions();
  }

}
