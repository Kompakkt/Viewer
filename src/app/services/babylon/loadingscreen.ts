import * as BABYLON from 'babylonjs';
import Nullable = BABYLON.Nullable;
import {LoadingscreenhandlerService} from '../loadingscreenhandler/loadingscreenhandler.service';

/**
 * Extends Babylon.js/src/Loading/babylon.loadingScreen.ts
 * @author Jan G. Wieners
 */

export class LoadingScreen implements BABYLON.ILoadingScreen {

  private loadingDiv: Nullable<HTMLDivElement>;
  private loadingTextDiv: HTMLDivElement;

  /**
   * Creates a new default loading screen
   * @param renderingCanvas defines the canvas used to render the scene
   * @param loadingText defines the default text to display
   * @param loadingDivBackgroundColor defines the default background color
   * @param logo defines the logo getting displayed
   */
  constructor(private renderingCanvas: HTMLCanvasElement,
              private loadingText = '',
              private loadingDivBackgroundColor = 'black',
              private logo = '',
              private loadingScreenHandler: LoadingscreenhandlerService) {
    this.loadingScreenHandler.backgroundColor = this.loadingDivBackgroundColor;
    this.loadingScreenHandler.logo = this.logo;
    window.addEventListener('resize', this.resizeLoadingUI);
  }

  /**
   * Function called to display the loading screen
   */
  public displayLoadingUI(): void {
    if (!this.loadingScreenHandler.isLoading) {
      this.loadingScreenHandler.updateOpacity('1');
    }
  }

  /**
   * Function called to hide the loading screen
   */
  public hideLoadingUI(): void {
    if (this.loadingScreenHandler.isLoading) {
      // TODO: remove Timeout and make markers disappear quicker
      setTimeout(() => {
        this.loadingScreenHandler.updateOpacity('0');
      }, 500);
    }
  }

  /**
   * Gets or sets the text to display while loading
   */
  public set loadingUIText(text: string) {
    this.loadingScreenHandler.updateLoadingText(text);
  }

  public get loadingUIText(): string {
    return this.loadingScreenHandler.loadingText.source['value'];
  }

  /**
   * Gets or sets the color to use for the background
   */
  public get loadingUIBackgroundColor(): string {
    return this.loadingScreenHandler.backgroundColor;
  }

  public set loadingUIBackgroundColor(color: string) {
    this.loadingScreenHandler.backgroundColor = color;
  }

  private resizeLoadingUI = () => {
    const canvasRect = this.renderingCanvas.getBoundingClientRect();

    this.loadingScreenHandler.updateLoadingStyle({
      top: canvasRect.top + 'px',
      left: canvasRect.left + 'px',
      width: canvasRect.width + 'px',
      height: canvasRect.height + 'px'
    });
  }
}
