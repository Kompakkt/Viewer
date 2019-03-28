import {Component, Input, OnInit} from '@angular/core';
import {Annotation} from 'src/app/interfaces/annotation2/annotation2';

import {AnnotationService} from '../../services/annotation/annotation.service';
import {AnnotationmarkerService} from '../../services/annotationmarker/annotationmarker.service';
import {BabylonService} from '../../services/babylon/babylon.service';
import {CameraService} from '../../services/camera/camera.service';
import {DataService} from '../../services/data/data.service';
import {SocketService} from '../../services/socket/socket.service';
import {LoadModelService} from '../../services/load-model/load-model.service';

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
  public labelVisibility = 'Hide';

  public id = '';

  constructor(private dataService: DataService,
              private annotationService: AnnotationService,
              private babylonService: BabylonService,
              private cameraService: CameraService,
              private annotationmarkerService: AnnotationmarkerService,
              private socketService: SocketService,
              public loadModelService: LoadModelService) {
  }

  ngOnInit() {

    if (this.annotation) {

      this.id = this.annotation._id;
      this.preview = this.annotation.body.content.relatedPerspective.preview;
    }
  }

  public toViewMode() {
    this.editMode = false;
    this.labelMode = 'edit';
    this.labelModeText = 'edit';
    this.collapsed = true;
  }

  public changeOpenPopup() {
    this.annotationmarkerService.toggleCreatorPopup(this.id);
    this.babylonService.hideMesh(this.id, true);
    this.showAnnotation = true;
    this.labelVisibility = 'Hide';
  }

  public getValidation(validated) {
    if (validated) {
      this.annotation.validated = true;
      return 'validated';
    } else {
      this.annotation.validated = false;
      return 'unvalidated';
    }
  }

  public async selectPerspective() {

    this.annotation.body.content.relatedPerspective.vector = this.cameraService.getActualCameraPosAnnotation();

    await this.babylonService.createPreviewScreenshot(400).then(detailScreenshot => {

      this.preview = detailScreenshot;
    });
  }

  public deleteAnnotation(): void {
    this.annotationService.deleteAnnotation(this.annotation);
  }

  public toggleEditViewMode() {
    if (this.editMode) {
      this.editMode = false;
      this.labelMode = 'edit';
      this.labelModeText = 'edit';
      this.save();
    } else {
      this.collapsed = false;
      this.editMode = true;
      this.labelMode = 'remove_red_eye';
      this.labelModeText = 'view';
    }
  }

  private save(): void {
    this.dataService.updateAnnotation(this.annotation);
    // 1.1.2
    if (this.annotationService.inSocket) {
      this.socketService.socket.emit('editAnnotation', [this.annotationService.socketRoom, this.annotation]);
    }
  }

  public onSubmit(event) {
    console.log(event);
  }

  public setEditMode(mode: boolean) {
    if (!mode && this.editMode) {
      this.editMode = false;
      this.labelMode = 'edit';
      this.labelModeText = 'edit';
      this.save();
    } else if (mode && !this.editMode) {
      this.collapsed = false;
      this.editMode = true;
      this.labelMode = 'remove_red_eye';
      this.labelModeText = 'view';
    } else {
      return;
    }
  }

  public toggleVisibility() {
    if (this.showAnnotation) {
      this.showAnnotation = false;
      this.labelVisibility = 'Show';
      this.annotationmarkerService.closeCreatorPopup(this.annotation._id);
      this.babylonService.hideMesh(this.annotation._id, false);

    } else {
      this.showAnnotation = true;
      this.labelVisibility = 'Hide';
      this.annotationmarkerService.toggleCreatorPopup(this.annotation._id);
      this.babylonService.hideMesh(this.annotation._id, true);
    }
  }
}
