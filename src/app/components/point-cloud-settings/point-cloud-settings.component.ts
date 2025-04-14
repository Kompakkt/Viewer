import { Component } from '@angular/core';
import { ButtonComponent, LabelledCheckboxComponent, SliderComponent } from 'komponents';
import { TranslatePipe } from 'src/app/pipes/translate.pipe';
import { EptImporter } from 'src/app/services/babylon/importers/ept/ept-importer';

@Component({
  selector: 'app-point-cloud-settings',
  imports: [TranslatePipe, SliderComponent, ButtonComponent, LabelledCheckboxComponent],
  templateUrl: './point-cloud-settings.component.html',
  styleUrl: './point-cloud-settings.component.scss',
})
export class PointCloudSettingsComponent {
  get currentLevelOfDetail() {
    return EptImporter.currentLOD;
  }

  get maxLevelOfDetail() {
    return EptImporter.maxLOD;
  }

  get currentPointSize() {
    return EptImporter.pointMat?.pointSize ?? 1;
  }

  get loadedPointsCount() {
    return EptImporter.totalLoadedPoints.toLocaleString('en-US').replaceAll(',', ' ');
  }

  get totalPointsCount() {
    return EptImporter.totalPoints.toLocaleString('en-US').replaceAll(',', ' ');
  }

  get pointsOfNextLevel() {
    return (EptImporter.pointsPerLevel?.[EptImporter.currentLOD + 1] ?? 0)
      .toLocaleString('en-US')
      .replaceAll(',', ' ');
  }

  get loadedPointsPercentage() {
    return ((EptImporter.totalLoadedPoints / EptImporter.totalPoints) * 100).toFixed(2);
  }

  loadNextLevelOfDetail() {
    if (this.currentLevelOfDetail < this.maxLevelOfDetail) {
      EptImporter.loadNextLevelOfDetail?.();
    }
  }

  changePointSize(size: number) {
    EptImporter.changePointSize(size);
  }

  toggleOctreeBoxes() {
    EptImporter.toggleDebugMatVisibility();
  }
}
