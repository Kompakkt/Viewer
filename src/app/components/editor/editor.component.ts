import {Component, HostBinding, Input, NgZone, OnInit} from '@angular/core';
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
  @Input() modelFileName: string;

  constructor(private sidenavService: SidenavService,
              private actionService: ActionService,
              public annotationService: AnnotationService) {
  }


  ngOnInit() {
    this.sidenavService.change.subscribe(isOpen => {
      this.isOpen = isOpen;
      // TODO initialize after model is loaded!
      this.actionService.pickableModel(this.modelFileName, this.isOpen);
      this.annotationService.initializeAnnotationMode(this.modelFileName);
    });
  }

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.annotationService.annotations, event.previousIndex, event.currentIndex);
    this.annotationService.changedRankingPositions();
  }

}
