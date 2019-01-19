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
      saveAs(new Blob([this.annotationService.exportAnnotations()],
        {type: 'text/plain;charset=utf-8'}), 'annotations.json');
  }

  public importAnnotations(files: FileList): void {

    const fileToUpload = files.item(0),
      fileReader: FileReader = new FileReader();

    fileReader.onload = (e) => {

      if (typeof fileReader.result === 'string') {

        this.deleteAnnotations();
        this.annotationService.importAnnotations(fileReader.result);
      }
    };

    if (fileToUpload) {
      fileReader.readAsText(fileToUpload);
    }

  }

  public deleteAnnotations() {
    this.annotationService.deleteAllAnnotations();
  }

}
