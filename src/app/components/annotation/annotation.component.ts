import {Component, OnInit} from '@angular/core';
import {Annotation} from '../../interfaces/annotation/annotation';

@Component({
  selector: 'app-annotation',
  templateUrl: './annotation.component.html',
  styleUrls: ['./annotation.component.css']
})
export class AnnotationComponent implements OnInit {

  public positionTop;
  public positionLeft;

  annotation: Annotation = {
    counter: 1,
    id: 1,
    validated: true,
    title: 'Interesting Annotation',
    description: 'Here you can write interesting or uninteresting things about your annotation.'
  };

  constructor() {
    this.positionTop = '15';
    this.positionLeft = '15';
  }

  public takeScreenshot() {

  }

  ngOnInit() {
  }

}
