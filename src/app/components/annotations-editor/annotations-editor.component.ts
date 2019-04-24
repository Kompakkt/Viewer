import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {Annotation} from '../../interfaces/annotation2/annotation2';

import {AnnotationService} from '../../services/annotation/annotation.service';
import {AnnotationmarkerService} from '../../services/annotationmarker/annotationmarker.service';
import {BabylonService} from '../../services/babylon/babylon.service';
import {CameraService} from '../../services/camera/camera.service';
import {CatalogueService} from '../../services/catalogue/catalogue.service';
import {DataService} from '../../services/data/data.service';
import {LoadModelService} from '../../services/load-model/load-model.service';
import {SocketService} from '../../services/socket/socket.service';
import {UserdataService} from '../../services/userdata/userdata.service';

@Component({
  selector: 'app-annotations-editor',
  templateUrl: './annotations-editor.component.html',
  styleUrls: ['./annotations-editor.component.scss'],
})
export class AnnotationsEditorComponent implements OnInit {

  @Input() annotation: Annotation;

  public collapsed = false;
  public editMode = true;
  public labelMode = 'remove_red_eye';
  public labelModeText = 'view';
  public preview = '';
  public showAnnotation = true;
  public isDefault: boolean;
  public isOwner: boolean;
  public isDefaultLoad: boolean;
  public isCollection: boolean;
  public isCollectionOwner: boolean;
  private selectedAnnotation: string;
  private editModeAnnotation: string;

  public showMediaBrowser = false;

  public id = '';

  @ViewChild('annotationContent') private annotationContent;

  constructor(private dataService: DataService,
              private annotationService: AnnotationService,
              private babylonService: BabylonService,
              private cameraService: CameraService,
              private annotationmarkerService: AnnotationmarkerService,
              private socketService: SocketService,
              public loadModelService: LoadModelService,
              private userdataService: UserdataService,
              private catalogueService: CatalogueService) {
  }

  ngOnInit() {

    if (this.annotation) {

      this.isDefault = (!this.annotation.target.source.relatedCompilation ||
        this.annotation.target.source.relatedCompilation === '');

      this.isOwner = this.userdataService.isAnnotationOwner(this.annotation);

      this.catalogueService.defaultLoad.subscribe(defaultLoad => {
        this.isDefaultLoad = defaultLoad;
      });

      this.loadModelService.Observables.actualCollection.subscribe(actualCompilation => {
        actualCompilation._id ? this.isCollection = true : this.isCollection = false;
      });

      this.id = this.annotation._id;
      this.preview = this.annotation.body.content.relatedPerspective.preview;
    }

    this.userdataService.collectionOwner.subscribe(owner => {
      this.isCollectionOwner = owner;
    });

    this.annotationService.isSelectedAnnotation.subscribe(selectedAnno => {
      this.selectedAnnotation = selectedAnno;
      if (this.selectedAnnotation === this.annotation._id && !this.showAnnotation) {
        this.showAnnotation = true;
        this.babylonService.hideMesh(this.annotation._id, true);
      }
    });

    this.annotationService.isEditModeAnnotation.subscribe(selectedAnno => {
      this.editModeAnnotation = selectedAnno;
      if (selectedAnno === this.annotation._id && !this.editMode) {
        this.editMode = true;
        this.annotationService.setSelectedAnnotation(this.annotation._id);
        this.labelMode = 'remove_red_eye';
        this.labelModeText = 'view';
      }
      if (selectedAnno === this.annotation._id && this.editMode) {
        return;
      }
      if (selectedAnno !== this.annotation._id && this.editMode) {
        this.editMode = false;
        this.labelMode = 'edit';
        this.labelModeText = 'edit';
        this.save();
      } else {
        this.editMode = false;
        this.labelMode = 'edit';
        this.labelModeText = 'edit';
      }
    });
  }

  public addMedium(medium) {

    const mdImage = `![alt ${medium.description}](${medium.url})`;

    this.annotationContent.nativeElement.focus();

    const start = this.annotationContent.nativeElement.selectionStart;
    const value = this.annotationContent.nativeElement.value;

    this.annotation.body.content.description =
      `${value.substring(0, start)}${mdImage}${value.substring(start, value.length)}`;
  }

  private hiddenAnnotation(ID) {
    if (this.annotation._id === ID) {
      this.showAnnotation = true;
    }
  }

  public changeOpenPopup() {
    if (!this.editMode) {
      this.collapsed = !this.collapsed;
    }
    this.collapsed && this.selectedAnnotation === this.annotation._id ?
      this.annotationService.setSelectedAnnotation('') :
      this.annotationService.setSelectedAnnotation(this.annotation._id);
    this.babylonService.hideMesh(this.id, true);
    this.showAnnotation = true;
  }

  public toggleVisibility() {
    if (this.showAnnotation) {
      this.showAnnotation = false;
      if (this.selectedAnnotation === this.annotation._id) {
        this.annotationService.setSelectedAnnotation('');
      }
      this.babylonService.hideMesh(this.annotation._id, false);
    } else {
      this.showAnnotation = true;
      this.annotationService.setSelectedAnnotation(this.annotation._id);
      this.babylonService.hideMesh(this.annotation._id, true);
    }
  }

  public async selectPerspective() {

    await this.babylonService.createPreviewScreenshot(400).then(detailScreenshot => {

      const camera = this.cameraService.getActualCameraPosAnnotation();
      this.annotation.body.content.relatedPerspective = {
        cameraType: camera.cameraType,
        position: {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
        },
        target: {
          x: camera.target.x,
          y: camera.target.y,
          z: camera.target.z,
        },
        preview: detailScreenshot,
      };

      this.preview = detailScreenshot;
    });
  }

  public deleteAnnotation(): void {
    this.annotationService.deleteAnnotation(this.annotation);
  }

  private save(): void {
    this.annotationService.updateAnnotation(this.annotation);
    // 1.1.2
    if (this.annotationService.inSocket) {
      this.socketService.socket.emit('editAnnotation',
        [this.annotationService.socketRoom, this.annotation]);
    }
  }

  public onSubmit(event) {
    console.log(event);
  }

}
