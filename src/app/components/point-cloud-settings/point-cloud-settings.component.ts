import { Component } from '@angular/core';
import { ButtonComponent, LabelledCheckboxComponent, SliderComponent } from 'komponents';
import { TranslatePipe } from 'src/app/pipes/translate.pipe';
import { PointCloudImporter } from 'src/app/services/babylon/importers/common/point-cloud-importer';

@Component({
  selector: 'app-point-cloud-settings',
  imports: [TranslatePipe, SliderComponent, ButtonComponent, LabelledCheckboxComponent],
  templateUrl: './point-cloud-settings.component.html',
  styleUrl: './point-cloud-settings.component.scss',
})
export class PointCloudSettingsComponent {
  get currentLevelOfDetail() {
    return PointCloudImporter.currentLOD;
  }

  get maxLevelOfDetail() {
    return PointCloudImporter.maxLOD;
  }

  get currentPointSize() {
    return PointCloudImporter.pointMat?.pointSize ?? 1;
  }

  get loadedPointsCount() {
    return PointCloudImporter.totalLoadedPoints.toLocaleString('en-US').replaceAll(',', ' ');
  }

  get totalPointsCount() {
    return PointCloudImporter.totalPoints.toLocaleString('en-US').replaceAll(',', ' ');
  }

  get pointsOfNextLevel() {
    return (PointCloudImporter.pointsPerLevel?.[PointCloudImporter.currentLOD + 1] ?? 0)
      .toLocaleString('en-US')
      .replaceAll(',', ' ');
  }

  get loadedPointsPercentage() {
    return ((PointCloudImporter.totalLoadedPoints / PointCloudImporter.totalPoints) * 100).toFixed(
      2,
    );
  }

  loadNextLevelOfDetail() {
    if (this.currentLevelOfDetail < this.maxLevelOfDetail) {
      PointCloudImporter.loadNextLevelOfDetail?.();
    }
  }

  changePointSize(size: number) {
    PointCloudImporter.changePointSize(size);
  }

  toggleOctreeBoxes() {
    PointCloudImporter.toggleDebugMatVisibility();
  }
}
