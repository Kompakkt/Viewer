import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {Component, HostBinding, Input, OnInit, ViewChild} from '@angular/core';
import {AfterViewInit, QueryList, ViewChildren} from '@angular/core';
import {MatDialog} from '@angular/material';
import {saveAs} from 'file-saver';

import {environment} from '../../../environments/environment.prod';
import {AnnotationService} from '../../services/annotation/annotation.service';
import {AnnotationmarkerService} from '../../services/annotationmarker/annotationmarker.service';
import {LoadModelService} from '../../services/load-model/load-model.service';
import {OverlayService} from '../../services/overlay/overlay.service';
import {AnnotationsEditorComponent} from '../annotations-editor/annotations-editor.component';
import {DialogDeleteAnnotationsComponent} from '../dialogs/dialog-delete-annotations/dialog-delete-annotations.component';
import {CatalogueService} from '../../services/catalogue/catalogue.service';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss'],
})
export class EditorComponent implements OnInit, AfterViewInit {

  @HostBinding('class.is-open') private isOpen = false;
  @Input() modelFileName: string;
  @ViewChild('tabGroup') tabGroup;

  public version: string = environment.version;

  public selectedTab;
  public meshSettingsMode;
  public defaultAnnotationsMode;
  public isModelOwner: boolean;
  public isSingleModel: boolean;

  public popup_is_open = '';
  @ViewChildren(AnnotationsEditorComponent)
  annotationsList: QueryList<AnnotationsEditorComponent>;

  constructor(private overlayService: OverlayService,
              public annotationService: AnnotationService,
              private annotationmarkerService: AnnotationmarkerService,
              private loadModelService: LoadModelService,
              public dialog: MatDialog,
              private catalogueService: CatalogueService) {
  }

  ngOnInit() {

    this.overlayService.editor.subscribe(editorIsOpen => {
      this.isOpen = editorIsOpen;
      this.annotationService.annotationMode(this.isOpen);
    });

    this.overlayService.editorSetting.subscribe(meshSettingsMode => {
      this.meshSettingsMode = meshSettingsMode;
      if (this.isOpen) {
        if (meshSettingsMode) {
          this.annotationService.annotationMode(false);
          this.changeTab(1);
        } else {
          this.annotationService.annotationMode(true);
        }
      }
    });

    this.overlayService.defaultAnnotations.subscribe(annotationsMode => {
      this.defaultAnnotationsMode = annotationsMode;
      if (this.isOpen && annotationsMode) {
        this.annotationService.annotationMode(true);
        this.changeTab(0);
      }
    });

    this.loadModelService.modelOwner.subscribe(isModelOwner => {
        this.isModelOwner = isModelOwner;
    });

    this.catalogueService.singleObject.subscribe(singleObject => {
      this.isSingleModel = singleObject;
    });
  }

  ngAfterViewInit(): void {

    // setVisabile for newly created annotation by double click on mesh
    this.annotationsList.changes.subscribe(() => {
      this.setVisability(this.annotationmarkerService.open_popup);
    });

    // setVisabile for freshly clicked annotation-List-elements
    this.annotationmarkerService.popupIsOpen().subscribe(
      popup_is_open => this.setVisability(popup_is_open),
    );
  }

  public setVisability(id: string) {
    const found = this.annotationsList.find(annotation => annotation.id === id);
    if (found) {
      const foundID = found.id;
      this.annotationsList.forEach(function(value) {
        if (value.id != foundID) {
          value.toViewMode();
        } else {
          value.collapsed = false;
        }
      });
    }
  }

  drop(event: CdkDragDrop<string[]>) {

    moveItemInArray(this.annotationService.annotations, event.previousIndex, event.currentIndex);
    this.annotationService.changedRankingPositions();
  }

  private changeTab(tabIndex) {
    console.log('Gerade ausgewählt: ', this.tabGroup.selectedIndex, tabIndex);

    if (tabIndex <= 3 && tabIndex >= 0) {
      this.tabGroup.selectedIndex = tabIndex;
    }
  }

  public exportAnnotations() {
    saveAs(new Blob([this.annotationService.exportAnnotations()],
      {type: 'text/plain;charset=utf-8'}), 'annotations.json');
  }

  public importAnnotations(files: FileList): void {

    const fileToUpload = files.item(0),
      fileReader: FileReader = new FileReader();

    fileReader.onload = e => {

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

    const dialogRef = this.dialog.open(DialogDeleteAnnotationsComponent);

    dialogRef.afterClosed().subscribe(deleteAll => {

      if (deleteAll) {
        this.annotationService.deleteAllAnnotations();
      }
    });
  }

}
