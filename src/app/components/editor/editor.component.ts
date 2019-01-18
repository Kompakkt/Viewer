import {Component, HostBinding, Input, OnInit} from '@angular/core';
import {OverlayService} from '../../services/overlay/overlay.service';
import {AnnotationService} from '../../services/annotation/annotation.service';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';

import {saveAs} from 'file-saver';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss']
})
export class EditorComponent implements OnInit {

  @HostBinding('class.is-open') private isOpen = false;
  @Input() modelFileName: string;

  constructor(private overlayService: OverlayService,
              public annotationService: AnnotationService) {
  }

  ngOnInit() {

    this.overlayService.editor.subscribe(editorIsOpen => {
      this.isOpen = editorIsOpen;
      this.annotationService.annotationMode(this.isOpen);
    });
  }

  drop(event: CdkDragDrop<string[]>) {

    moveItemInArray(this.annotationService.annotations, event.previousIndex, event.currentIndex);
    this.annotationService.changedRankingPositions();
  }

  public exportAnnotations() {

    this.annotationService.exportAnnotations().then((dump) => {

      saveAs(new Blob([dump], {type: 'text/plain;charset=utf-8'}), 'annotations.json');
    });
  }

}
