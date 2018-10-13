import {Component, HostBinding, OnInit} from '@angular/core';
import {SidenavService} from '../../services/sidenav/sidenav.service';
import { ANNOTATIONS } from 'src/assets/exampleDataAnnotations/mock-annotations';


@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent implements OnInit {


  @HostBinding('class.is-open') private isOpen = false;
  annotations = ANNOTATIONS;

  constructor(private sidenavService: SidenavService) {
  }

  ngOnInit() {

    this.sidenavService.change.subscribe(isOpen => {
      this.isOpen = isOpen;
    });
  }
}
