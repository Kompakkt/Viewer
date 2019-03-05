import {Component, HostBinding, Input, OnInit} from '@angular/core';
import {AfterViewInit, QueryList, ViewChildren} from '@angular/core';
import {OverlayService} from '../../services/overlay/overlay.service';
import {AnnotationService} from '../../services/annotation/annotation.service';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';

import {saveAs} from 'file-saver';
import {environment} from '../../../environments/environment.prod';

import {AnnotationsEditorComponent} from '../annotations-editor/annotations-editor.component';
import {AnnotationmarkerService} from '../../services/annotationmarker/annotationmarker.service';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss']
})
export class EditorComponent implements OnInit, AfterViewInit {

  @HostBinding('class.is-open') private isOpen = false;
  @Input() modelFileName: string;

  public version: string = environment.version;

  public popup_is_open = '';
  @ViewChildren(AnnotationsEditorComponent)
  annotationsList: QueryList<AnnotationsEditorComponent>;

  constructor(private overlayService: OverlayService,
              public annotationService: AnnotationService,
              private annotationmarkerService: AnnotationmarkerService) {
  }

  ngOnInit() {

    this.overlayService.editor.subscribe(editorIsOpen => {
      this.isOpen = editorIsOpen;
      this.annotationService.annotationMode(this.isOpen);
    });
  }

  ngAfterViewInit(): void {
    
    // setVisabile for newly created annotation by double click on mesh
    this.annotationsList.changes.subscribe(() => {
      this.setVisability(this.annotationmarkerService.open_popup);
    });

    // setVisabile for freshly clicked annotation-List-elements
    this.annotationmarkerService.popupIsOpen().subscribe(
      popup_is_open => this.setVisability(popup_is_open)
    );
  }

  public setVisability(id: string) {
    const found = this.annotationsList.find(annotation => annotation.id === id);
    if (found) {
      const foundID = found.id;
      this.annotationsList.forEach(function (value) {
        if (value.id != foundID){
          value.toViewMode();
        }
        else{
          value.collapsed = false;
        }
      });
    }
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
