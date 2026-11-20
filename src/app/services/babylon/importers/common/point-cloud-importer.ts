import { StandardMaterial } from '@babylonjs/core';
import { BehaviorSubject } from 'rxjs';

export class PointCloudImporter {
  public static debugMat?: StandardMaterial;
  public static toggleDebugMatVisibility() {
    if (!PointCloudImporter.debugMat) return;
    PointCloudImporter.debugMat.alpha = PointCloudImporter.debugMat.alpha <= 0.5 ? 1 : 0;
  }

  public static pointMat$ = new BehaviorSubject<StandardMaterial | undefined>(undefined);
  /**
   * Change the point size of the point cloud material.
   * @param size
   * @returns
   */
  public static changePointSize(size: number) {
    if (Number.isNaN(size)) size = 1;
    if (size < 0.1) size = 0.1;
    if (size > 10) size = 10;
    if (!PointCloudImporter.pointMat$.getValue()) return;
    PointCloudImporter.pointMat$.getValue()!.pointSize = size;
  }

  public static currentLOD$ = new BehaviorSubject(0);
  public static maxLOD$ = new BehaviorSubject(10);
  public static loadNextLevelOfDetail?: () => Promise<void>;

  public static totalLoadedPoints$ = new BehaviorSubject(0);
  public static totalPoints$ = new BehaviorSubject(Number.MAX_SAFE_INTEGER);
  public static pointsPerLevel$ = new BehaviorSubject<number[]>([]);
}
