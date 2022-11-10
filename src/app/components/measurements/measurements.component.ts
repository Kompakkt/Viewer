import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { combineLatest, map } from 'rxjs';
import {
  MeasurementService,
  ReferenceUnit,
} from 'src/app/services/measurement/measurement.service';

@Component({
  selector: 'app-measurements',
  templateUrl: './measurements.component.html',
  styleUrls: ['./measurements.component.scss'],
})
export class MeasurementsComponent implements OnInit {
  public formGroup = new FormGroup({
    length: new FormControl(10),
    unit: new FormControl<ReferenceUnit>('cm'),
  });

  constructor(public measurement: MeasurementService) {}

  get points$() {
    return combineLatest([this.measurement.sliceLength$, this.measurement.slice$]).pipe(
      map(([length, slice]) => {
        const missing = length - slice.length;
        const missingArr = new Array<undefined>(missing).fill(undefined);
        return [...slice, ...missingArr];
      }),
    );
  }

  public saveMeasurement() {
    const { length, unit } = this.formGroup.getRawValue();
    if (!length || !unit) return;
    this.measurement.saveMeasurement({ length, unit });
  }

  ngOnInit(): void {}
}
