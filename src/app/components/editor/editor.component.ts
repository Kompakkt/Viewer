import {Component, HostBinding, NgZone, OnInit} from '@angular/core';
import {SidenavService} from '../../services/sidenav/sidenav.service';
import {AnnotationService} from '../../services/annotation/annotation.service';
import {ActionService} from '../../services/action/action.service';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';


@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent implements OnInit {

  @HostBinding('class.is-open') private isOpen = false;

  constructor(private sidenavService: SidenavService,
              private actionService: ActionService,
              public annotationService: AnnotationService) {
  }


  ngOnInit() {
    this.sidenavService.change.subscribe(isOpen => {
      this.isOpen = isOpen;
      this.actionService.pickableModel('Texture_0', this.isOpen);
      // TODO initialize after model is loaded!
      this.annotationService.initializeAnnotationMode('Texture_0');
    });


    this.getAnnotations();
  }

  getAnnotations(): void {
    this.annotationService.annotations$ = this.annotationService.fetchAnnotations();
  }

  drop(event: CdkDragDrop<string[]>) {
    // moveItemInArray(this.annotationService.annotations$, event.previousIndex, event.currentIndex);
  }

}
