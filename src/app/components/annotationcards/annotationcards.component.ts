import {AfterViewInit, Component, Input, OnInit, QueryList, ViewChildren} from '@angular/core';
import {AnnotationService} from '../../services/annotation/annotation.service';
import {AnnotationmarkerService} from '../../services/annotationmarker/annotationmarker.service';
import {AnnotationComponent} from '../annotation/annotation.component';

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

    // setVisabile for newly created annotation by double click on mesh
    this.annotationsList.changes.subscribe(() => {
      this.setVisability(this.annotationmarkerService.open_popup);

      
    });

    // setVisabile for freshly clicked annotationmarkers
    this.annotationmarkerService.popupIsOpen().subscribe(
      popup_is_open => this.setVisability(popup_is_open)
    );
  }

  public setVisability(id: string) {
    const found = this.annotationsList.find(annotation => annotation.id === id);
    if (found) {
      // save "found editMode" befor changing editMode of all Annotations
      const foundID = found.id;
      this.hideAllCards(foundID);
    }
  }

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
