import {Component, HostBinding, NgZone, OnInit} from '@angular/core';
import {SidenavService} from '../../services/sidenav/sidenav.service';
import {AnnotationService} from '../../services/annotation/annotation.service';
import {Annotation} from '../../interfaces/annotation/annotation';
import {DataService} from '../../services/data/data.service';


@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent implements OnInit {

  public testanno: Array<Annotation>;


  @HostBinding('class.is-open') private isOpen = false;

  constructor(private sidenavService: SidenavService, public annotationService: AnnotationService) {
  }

  ngOnInit() {

    this.sidenavService.change.subscribe(isOpen => {
      this.isOpen = isOpen;
    });

    this.getAnnotations();
  }

  getAnnotations(): void {
    this.annotationService.annotations$ = this.annotationService.fetchAnnotations();
  }

}
