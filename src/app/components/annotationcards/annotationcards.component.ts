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

  @ViewChildren(AnnotationComponent)
  annotationsList: QueryList<AnnotationComponent>;

  constructor(public annotationService: AnnotationService, private annotationmarkerService: AnnotationmarkerService) {
  }

  ngOnInit() {
  }

  ngAfterViewInit(): void {

    this.annotationsList.changes.subscribe(() => {
      // setVisabile for newly created annotation by double click on mesh
      this.setVisability(this.annotationmarkerService.open_popup, true);
    });

    this.annotationmarkerService.popupIsOpen().subscribe(
      // setVisabile for newly on-clicked annotationmarkers
      popup_is_open => this.setVisability(popup_is_open, true)
    );
  }

  public setVisability(id: string, visibility: boolean) {
    const found = this.annotationsList.find(annotation => annotation.id === id);
    if (found) {
      // 21/02/19
      // save "found editMode" befor changing editMode of all Annotations
      const foundID = found.id;
      this.hideAllCards(foundID);
    }
  }

  // 22/02/19
  public hideAllCards(foundID) {
    this.annotationsList.forEach(function (value) {
      if (value.id != foundID){
        // Hide all not-clicked annotations and set to view-mode 
        value.visabilityAnnotationCard(false);      
        if (value.editMode){
          value.toggleEditViewMode();
        }
      }
      else{
        // show clicked one
        value.visabilityAnnotationCard(true);     
      }
    });
  }


}
