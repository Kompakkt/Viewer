import { ILoadingScreen } from '@babylonjs/core';

/**
 * Extends Babylon.js/src/Loading/babylon.loadingScreen.ts
 * @author Jan G. Wieners
 */

export class LoadingScreen implements ILoadingScreen {
  private text = '';

  /**
   * Creates a new default loading screen
   * @param renderingCanvas defines the canvas used to render the scene
   * @param loadingText defines the default text to display
   * @param loadingDivBackgroundColor defines the default background color
   * @param logo defines the logo getting displayed
   */
  constructor(
    private renderingCanvas: HTMLCanvasElement,
    private loadingDivBackgroundColor = 'black',
    private logo = '',
    private loadingScreenHandler: LoadingscreenhandlerService,
  ) {
    this.loadingScreenHandler.backgroundColor = this.loadingDivBackgroundColor;
    this.loadingScreenHandler.logo = this.logo;
    window.addEventListener('resize', this.resizeLoadingUI);
    this.loadingScreenHandler.loadingText.subscribe(text => (this.text = text));
  }

  /**
   * Function called to display the loading screen
   */
  public async displayLoadingUI() {
    if (!(await firstValueFrom(this.loadingScreenHandler.isLoading$))) {
      this.loadingScreenHandler.updateOpacity('1');
    }
  }

  /**
   * Function called to hide the loading screen
   */
  public async hideLoadingUI() {
    if (await firstValueFrom(this.loadingScreenHandler.isLoading$)) {
      // setTimeout of half a second to prevent pop-in
      // of some bigger meshes
      setTimeout(() => this.loadingScreenHandler.updateOpacity('0'), 500);
    }
  }

  /**
   * Gets or sets the text to display while loading
   */
  public set loadingUIText(text: string) {
    this.loadingScreenHandler.updateLoadingText(text);
  }

  public get loadingUIText(): string {
    return this.text;
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
      top: `${canvasRect.top}px`,
      left: `${canvasRect.left}px`,
      width: `${canvasRect.width}px`,
      height: `${canvasRect.height}px`,
    });
  };
}

import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoadingscreenhandlerService {
  private OpacitySubject = new BehaviorSubject<string>('1');
  public opacity = this.OpacitySubject.asObservable();
  private TextSubject = new BehaviorSubject<string>('Loading');
  public loadingText = this.TextSubject.asObservable();
  private isLoading = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.isLoading.asObservable();

  private StyleSubject = new BehaviorSubject<any>({
    left: '0px',
    top: '0px',
    width: '100%',
    height: '100%',
  });

  public loadingStyle = this.StyleSubject.asObservable();

  public backgroundColor = '#111111';
  public logo = 'assets/img/kompakkt-icon.png';

  public updateOpacity(newOpacity: string): void {
    this.isLoading.next(parseFloat(newOpacity) > 0.5);
    this.OpacitySubject.next(newOpacity);
  }

  public updateLoadingText(newText: string): void {
    this.TextSubject.next(newText);
  }

  public updateLoadingStyle(newStyle: any): void {
    this.StyleSubject.next(newStyle);
  }
}
