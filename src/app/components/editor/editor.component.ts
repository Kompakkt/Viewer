import {Component, HostBinding, HostListener, OnInit} from '@angular/core';
import {SidenavService} from '../../services/sidenav/sidenav.service';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent implements OnInit {

  @HostBinding('class.is-open') private isOpen = false;

  constructor(private sidenavService: SidenavService) {
  }

  ngOnInit() {

    this.sidenavService.change.subscribe(isOpen => {
      this.isOpen = isOpen;
    });
  }
}
