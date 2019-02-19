import {AfterViewInit, Component, Input, OnInit, QueryList, ViewChildren} from '@angular/core';
import {AnnotationService} from '../../services/annotation/annotation.service';
import {AnnotationComponent} from '../annotation/annotation.component';
import {AnnotationmarkerService} from '../../services/annotationmarker/annotationmarker.service';

@Component({
  selector: 'app-annotationcards',
  templateUrl: './annotationcards.component.html',
  styleUrls: ['./annotationcards.component.scss']
})
export class AnnotationcardsComponent implements OnInit, AfterViewInit {

  public popup_is_open = '';

  // @ViewChildren(AnnotationComponent) annotations : QueryList<AnnotationComponent>;
  @ViewChildren(AnnotationComponent)
  annotationsList: QueryList<AnnotationComponent>;

  constructor(public annotationService: AnnotationService, private annotationmarkerService: AnnotationmarkerService) {

  }

  ngOnInit() {
  }

  ngAfterViewInit(): void {
    
    this.annotationsList.changes.subscribe(() => {
      
      // 15/02/19
      // setVisabile only for newly created annotation (double click on mesh)
      this.setVisability(this.annotationmarkerService.open_popup, true);

      this.annotationsList.forEach(function (value) {
      })
    });

    this.annotationmarkerService.popupIsOpen().subscribe(
      popup_is_open => this.setVisability(popup_is_open, true)
    );
  }

  public setVisability(id: string, visibility: boolean) {
    if (this.annotationsList.find(annotation => annotation.id === id) != null) {
      this.hideAllCards();
      this.annotationsList.find(annotation => annotation.id === id).visabilityAnnotationCard(visibility);
    }
  }

  public hideAllCards() {
    if (this.annotationsList != null) {
      this.annotationsList.forEach(function (value) {
        value.visabilityAnnotationCard(false);
      });
    }
  }


}
