import {Component, Input, OnInit} from '@angular/core';
import {Annotation} from 'src/app/interfaces/annotation2/annotation2';
import {DataService} from '../../services/data/data.service';
import {AnnotationService} from '../../services/annotation/annotation.service';
import {BabylonService} from '../../services/babylon/babylon.service';
import {CameraService} from '../../services/camera/camera.service';
import {AnnotationmarkerService} from '../../services/annotationmarker/annotationmarker.service';


@Component({
  selector: 'app-annotations-editor',
  templateUrl: './annotations-editor.component.html',
  styleUrls: ['./annotations-editor.component.scss']
})
export class AnnotationsEditorComponent implements OnInit {

  @Input() annotation: Annotation;

  public collapsed = false;
  public editMode = true;
  public labelMode = 'remove_red_eye';
  public labelModeText = 'view';
  public preview = '';

  public id = '';

  constructor(private dataService: DataService, private annotationService: AnnotationService,
              private babylonService: BabylonService, private cameraService: CameraService,
              private annotationmarkerService: AnnotationmarkerService
  ) {
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
    this.dataService.updateAnnotation(this.annotation._id, this.annotation.body.content.title,
      this.annotation.body.content.description, this.preview,
      this.annotation.body.content.relatedPerspective.vector, this.annotation.validated);

    // 1.1.2
    // - Annotation bearbeiten (und aufs Auge klicken)
            // this.socketService.socket.emit(eventName, data);
            // emit "editAnnotation"
            this.annotationService.socketService.socket.emit('message', 'Annotation bearbeiten!');
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
}


