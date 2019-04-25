import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {Component, EventEmitter, HostBinding, Input, OnInit, Output, ViewChild} from '@angular/core';
import {AfterViewInit, QueryList, ViewChildren} from '@angular/core';
import {MatDialog, MatRadioButton, MatRadioChange} from '@angular/material';
import {saveAs} from 'file-saver';

import {environment} from '../../../environments/environment.prod';
import {AnnotationService} from '../../services/annotation/annotation.service';
import {AnnotationmarkerService} from '../../services/annotationmarker/annotationmarker.service';
import {CatalogueService} from '../../services/catalogue/catalogue.service';
import {LoadModelService} from '../../services/load-model/load-model.service';
import {OverlayService} from '../../services/overlay/overlay.service';
import {SocketService} from '../../services/socket/socket.service';
import {UserdataService} from '../../services/userdata/userdata.service';
import {AnnotationsEditorComponent} from '../annotations-editor/annotations-editor.component';
import {DialogDeleteAnnotationsComponent} from '../dialogs/dialog-delete-annotations/dialog-delete-annotations.component';

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
  public isDefaultLoad = true;
  public isCollectionSource: boolean;
  // 1.1.5
  public toggleChecked = false;

  public isShowCollection = false;

  public isannotationSourceCollection: boolean;

  public isCollection: boolean;

  public dragDisabled = true;

  private isCollectionOwner: boolean;

  public popup_is_open = '';
  @ViewChildren(AnnotationsEditorComponent)
  annotationsList: QueryList<AnnotationsEditorComponent>;

  constructor(private overlayService: OverlayService,
              public annotationService: AnnotationService,
              private annotationmarkerService: AnnotationmarkerService,
              private loadModelService: LoadModelService,
              public dialog: MatDialog,
              private catalogueService: CatalogueService,
              private socketService: SocketService,
              private userdataService: UserdataService) {
  }

  ngOnInit() {

    this.userdataService.collectionOwner.subscribe(owner => {
      this.isCollectionOwner = owner;
    });

    this.catalogueService.defaultLoad.subscribe(defaultLoad => {
      this.isDefaultLoad = defaultLoad;
      this.dragDisabled = false;
    });

    this.overlayService.editor.subscribe(editorIsOpen => {
      this.isOpen = editorIsOpen;
      if (!editorIsOpen) {
        this.annotationService.annotationMode(false);
      }
      if (editorIsOpen && this.meshSettingsMode) {
        this.annotationService.annotationMode(false);
      }
      if (editorIsOpen && !this.isCollectionSource && !this.isDefaultLoad) {
        this.annotationService.annotationMode(false);
        this.dragDisabled = true;
      }
      if (editorIsOpen && !this.meshSettingsMode && !this.isCollection &&
        !this.isModelOwner && !this.isDefaultLoad) {
        this.annotationService.annotationMode(false);
        this.dragDisabled = true;
      }
      if (editorIsOpen && this.isDefaultLoad) {
        this.annotationService.annotationMode(true);
        this.dragDisabled = false;
      }
      if (editorIsOpen && !this.meshSettingsMode && this.isCollection && this.isCollectionSource) {
        this.annotationService.annotationMode(true);
      }
      if (editorIsOpen && !this.meshSettingsMode && this.isCollection &&
        this.isCollectionSource && this.isCollectionOwner) {
        this.annotationService.annotationMode(true);
        this.dragDisabled = false;
      }
      if (editorIsOpen && !this.meshSettingsMode && !this.isCollection && this.isModelOwner) {
        this.annotationService.annotationMode(true);
        this.dragDisabled = false;
      }
    });

    this.annotationService.annotationSourceCollection.subscribe(annotationSourceCollection => {
      this.isCollectionSource = annotationSourceCollection;
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

    this.loadModelService.Observables.actualCollection.subscribe(actualCompilation => {
      actualCompilation._id ? this.isCollection = true : this.isCollection = false;
    });

  }

  ngAfterViewInit(): void {

    this.userdataService.modelOwner.subscribe(isModelOwner => {
      this.isModelOwner = isModelOwner;
    });

    this.catalogueService.singleObject.subscribe(singleObject => {
      this.isSingleModel = singleObject;
    });

  }

  public async drop(event: CdkDragDrop<string[]>) {

    moveItemInArray(this.annotationService.annotations, event.previousIndex, event.currentIndex);
    if (this.isCollectionSource && !this.isDefaultLoad) {
      moveItemInArray(this.annotationService.collectionAnnotationsSorted, event.previousIndex, event.currentIndex);
    } else {
      moveItemInArray(this.annotationService.defaultAnnotationsSorted, event.previousIndex, event.currentIndex);
    }
    await this.annotationService.changedRankingPositions(this.annotationService.annotations);
    await this.annotationService.redrawMarker();
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

  public onSocketToggleChange() {
    if (this.toggleChecked) {
      this.socketService.loginToSocket();
    } else {
      this.socketService.disconnectSocket();
    }
  }

  public changeCategory(mrChange: MatRadioChange) {
    const mrButton: MatRadioButton = mrChange.source;

    if (mrChange.value === 'c') {
      this.annotationService.toggleAnnotationSource(true, false);
      this.annotationService.annotationMode(true);
    }
    if (mrChange.value === 'd') {
      this.annotationService.annotationMode(false);
      this.annotationService.toggleAnnotationSource(false, false);
    }
  }

}
