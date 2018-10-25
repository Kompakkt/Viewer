import {AfterViewInit, Component, OnInit, QueryList, ViewChildren} from '@angular/core';
import {AnnotationService} from '../../services/annotation/annotation.service';
import {AnnotationComponent} from '../annotation/annotation.component';
import {AnnotationmarkerService} from '../../services/annotationmarker/annotationmarker.service';


@Component({
  selector: 'app-annotationcards',
  templateUrl: './annotationcards.component.html',
  styleUrls: ['./annotationcards.component.css']
})
export class AnnotationcardsComponent implements OnInit, AfterViewInit {

  //@ViewChildren(AnnotationComponent) annotations : QueryList<AnnotationComponent>;
  @ViewChildren(AnnotationComponent)
  annotations: QueryList<AnnotationComponent>;

  constructor(private annotationService: AnnotationService, private annotationmarkerService: AnnotationmarkerService) {

  }


  ngOnInit() {
    this.getAnnotations();
  }


  ngAfterViewInit(): void {
    this.annotations.changes
      .subscribe(() => this.annotations.forEach(function (value) {
          console.log(value);

          console.log('die ID ' + value.id);

        })
      );
  }

  public setVisability(id: string, visibility: boolean) {
    this.annotations.find(annotation => annotation.id === id).visabilityAnnotationCard(visibility);
  }


  getAnnotations(): void {
    this.annotationService.annotations$ = this.annotationService.fetchAnnotations();

  }

}