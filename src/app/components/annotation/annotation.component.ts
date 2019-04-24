import {Component, Input, OnInit} from '@angular/core';
import {MatDialog} from '@angular/material';
import {Matrix, Vector3} from 'babylonjs';
import {Annotation} from 'src/app/interfaces/annotation2/annotation2';
import {AnnotationmarkerService} from 'src/app/services/annotationmarker/annotationmarker.service';

import {AnnotationService} from '../../services/annotation/annotation.service';
import {BabylonService} from '../../services/babylon/babylon.service';
import {CatalogueService} from '../../services/catalogue/catalogue.service';
import {DataService} from '../../services/data/data.service';
import {LoadModelService} from '../../services/load-model/load-model.service';
import {SocketService} from '../../services/socket/socket.service';
import {UserdataService} from '../../services/userdata/userdata.service';
import {DialogAnnotationEditorComponent} from '../dialogs/dialog-annotation-editor/dialog-annotation-editor.component';

@Component({
  selector: 'app-annotation',
  templateUrl: './annotation.component.html',
  styleUrls: ['./annotation.component.scss'],
})

export class AnnotationComponent implements OnInit {

  @Input() annotation: Annotation;

  public editMode = false;
  public labelMode = 'edit';
  public labelModeText = 'edit';
  public positionTop = 0;
  public positionLeft = 0;
  public visibility = false;
  public id = '';
  public opacity = '0';
  public isDefault: boolean;
  public isOwner: boolean;
  public isDefaultLoad: boolean;
  public isCollection: boolean;
  private selectedAnnotation: string;
  private editModeAnnotation: string;

  constructor(private dataService: DataService,
              private annotationService: AnnotationService,
              private babylonService: BabylonService,
              private annotationmarkerService: AnnotationmarkerService,
              private socketService: SocketService,
              public dialog: MatDialog,
              private userdataService: UserdataService,
              private catalogueService: CatalogueService,
              private loadModelService: LoadModelService) {
  }

  ngOnInit() {

    if (this.annotation) {

      this.id = this.annotation._id;

      this.isDefault = (!this.annotation.target.source.relatedCompilation ||
        this.annotation.target.source.relatedCompilation === '');

      this.isOwner = this.userdataService.isAnnotationOwner(this.annotation);

      this.catalogueService.defaultLoad.subscribe(defaultLoad => {
        this.isDefaultLoad = defaultLoad;
      });

      this.loadModelService.Observables.actualCollection.subscribe(actualCompilation => {
        actualCompilation._id ? this.isCollection = true : this.isCollection = false;
      });

      this.annotationService.isSelectedAnnotation.subscribe(selectedAnno => {
        selectedAnno === this.annotation._id ? this.visibility = true : this.visibility = false;
        this.selectedAnnotation = selectedAnno;
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
        }
        if (selectedAnno !== this.annotation._id && !this.editMode) {
          return;
        }
      });

    }

    this.opacity = '1';

    setInterval(() => {
      this.setPosition(this.annotation);
    },          15);
  }

  public setPosition(annotation: Annotation) {

    const scene = this.babylonService.getScene();

    if (!scene) {
      return false;
    }

    const getMesh = scene.getMeshByName(annotation._id + '_pick');

    if (getMesh && scene.activeCamera) {
      const engine = this.babylonService.getEngine();

      const p = Vector3.Project(
        getMesh.getBoundingInfo().boundingBox.centerWorld,
        Matrix.Identity(),
        scene.getTransformMatrix(),
        scene.activeCamera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()),
      );

      this.positionTop = Math.round(p.y) + 5;
      this.positionLeft = Math.round(p.x) + 5;
    }
  }

  public visabilityAnnotationCard(visibility: boolean) {

    this.visibility = visibility;
    this.opacity = '1';
  }

  public deleteAnnotation(): void {

    this.opacity = '0';
    this.annotationService.deleteAnnotation(this.annotation);
  }

  private closeAnnotation(): void {
    this.opacity = '0';
    this.annotationService.setSelectedAnnotation('');
  }

  public setEditMode(mode: boolean) {
    if (!mode && this.editMode) {
      this.editMode = false;
      this.labelMode = 'edit';
      this.labelModeText = 'edit';
      this.save();
    } else if (mode && !this.editMode) {
      this.editMode = true;
      this.labelMode = 'remove_red_eye';
      this.labelModeText = 'view';
    } else {
      return;
    }
  }

  private save(): void {
    this.annotationService.updateAnnotation(this.annotation);
    // this.dataService.updateAnnotation(this.annotation);
    // 1.1.2
    if (this.annotationService.inSocket) {
      this.socketService.socket.emit('editAnnotation', [
        this.annotationService.socketRoom,
        this.annotation,
      ]);
    }
  }

  public editFullscreen(): void {

    const dialogRef = this.dialog.open(DialogAnnotationEditorComponent, {
      width: '75%',
      data: {
        title: this.annotation.body.content.title,
        content: this.annotation.body.content.description,
      },
    });

    dialogRef.afterClosed()
      .subscribe(result => {

        if (result) {
          this.annotation.body.content.title = result.title;
          this.annotation.body.content.description = result.content;
        }
        console.log(result);
      });
  }

  public getColor(): any {
    if (this.annotationService.coloredUsers.length) {
      for (let _i = 0; _i < this.annotationService.maxColoredUsersMinusOne; _i++) {
        if (this.annotationService.coloredUsers[_i]) {
          if (this.annotation.creator._id === this.annotationService.coloredUsers[_i]._id) {
            return this.annotationService.color[_i];
          }
        }
      }

      return '$cardbgr';

    }
  }
}
