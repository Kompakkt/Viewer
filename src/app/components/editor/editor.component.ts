import {Component, HostBinding, OnInit} from '@angular/core';
import {SidenavService} from '../../services/sidenav/sidenav.service';
import {AnnotationService} from '../../services/annotation/annotation.service';
import {Annotation} from '../../interfaces/annotation/annotation';


@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent implements OnInit {

  annotations: Annotation[];

  @HostBinding('class.is-open') private isOpen = false;

  constructor(private sidenavService: SidenavService, private annotationService: AnnotationService) {
  }

  ngOnInit() {

    this.sidenavService.change.subscribe(isOpen => {
      this.isOpen = isOpen;
    });

    this.getAnnotations();
  }

  getAnnotations(): void {
    this.annotationService.getAnnotations()
      .subscribe(annotations => this.annotations = annotations);
  }


}
