import * as BABYLON from 'babylonjs';
import Nullable = BABYLON.Nullable;

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
              private logo = '') {
  }

  /**
   * Function called to display the loading screen
   */
  public displayLoadingUI(): void {

    if (this.loadingDiv) {
      // Do not add a loading screen if there is already one
      return;
    }

    this.loadingDiv = document.createElement('div');

    if (this.logo) {

      const imgBack = new Image();
      imgBack.src = this.logo;

      imgBack.style.position = 'absolute';
      imgBack.style.left = '50%';
      imgBack.style.top = '50%';
      imgBack.style.marginLeft = '-60px';
      imgBack.style.marginTop = '-60px';
      imgBack.style.animation = 'spin1 2s infinite ease-in-out';
      imgBack.style.webkitAnimation = 'spin1 2s infinite ease-in-out';
      imgBack.style.transformOrigin = '50% 50%';
      imgBack.style.webkitTransformOrigin = '50% 50%';

      this.loadingDiv.appendChild(imgBack);
    }

    this.loadingDiv.id = 'loading-wrapper';
    this.loadingDiv.style.opacity = '0';
    this.loadingDiv.style.transition = 'opacity 2s ease';

    // Loading text
    this.loadingTextDiv = document.createElement('loading-text');
    this.loadingTextDiv.style.position = 'absolute';
    this.loadingTextDiv.style.left = '0';
    this.loadingTextDiv.style.top = '50%';
    this.loadingTextDiv.style.marginTop = '80px';
    this.loadingTextDiv.style.width = '100%';
    this.loadingTextDiv.style.height = '20px';
    this.loadingTextDiv.style.fontFamily = 'Verdana';
    this.loadingTextDiv.style.fontSize = '15px';
    this.loadingTextDiv.style.color = 'white';
    this.loadingTextDiv.style.textAlign = 'center';

    this.loadingDiv.appendChild(this.loadingTextDiv);

    this.loadingTextDiv.innerHTML = this.loadingText;

    // Generating keyframes
    var style = document.createElement('style');
    style.type = 'text/css';

    const keyFrames =
      `@-webkit-keyframes spin1 {\
                    0% { -webkit-transform: rotate(0deg);}
                    100% { -webkit-transform: rotate(360deg);}
                }\
                @keyframes spin1 {\
                    0% { transform: rotate(0deg);}
                    100% { transform: rotate(360deg);}
                }`;

    style.innerHTML = keyFrames;
    document.getElementsByTagName('head')[0].appendChild(style);

    this.resizeLoadingUI();

    window.addEventListener('resize', this.resizeLoadingUI);

    this.loadingDiv.style.backgroundColor = this.loadingDivBackgroundColor;
    document.body.appendChild(this.loadingDiv);

    this.loadingDiv.style.opacity = '1';
  }

  /**
   * Function called to hide the loading screen
   */
  public hideLoadingUI(): void {

    if (!this.loadingDiv) {
      return;
    }

    const onTransitionEnd = () => {

      if (!this.loadingDiv) {
        return;
      }
      document.body.removeChild(this.loadingDiv);
      window.removeEventListener('resize', this.resizeLoadingUI);

      this.loadingDiv = null;
    };

    this.loadingDiv.style.opacity = '0';
    this.loadingDiv.addEventListener('transitionend', onTransitionEnd);
  }

  /**
   * Gets or sets the text to display while loading
   */
  public set loadingUIText(text: string) {

    if (this.loadingTextDiv) {
      this.loadingTextDiv.innerHTML = text;
    }
  }

  public get loadingUIText(): string {
    return this.loadingText;
  }

  /**
   * Gets or sets the color to use for the background
   */
  public get loadingUIBackgroundColor(): string {
    return this.loadingDivBackgroundColor;
  }

  public set loadingUIBackgroundColor(color: string) {

    if (this.loadingDiv) {
      this.loadingDiv.style.backgroundColor = color;
    }
  }

  private resizeLoadingUI = () => {

    if (!this.loadingDiv) {
      return;
    }

    const canvasRect = this.renderingCanvas.getBoundingClientRect();

    this.loadingDiv.style.position = (window.getComputedStyle(this.renderingCanvas).position === 'fixed') ? 'fixed' : 'absolute';
    this.loadingDiv.style.left = canvasRect.left + 'px';
    this.loadingDiv.style.top = canvasRect.top + 'px';
    this.loadingDiv.style.width = canvasRect.width + 'px';
    this.loadingDiv.style.height = canvasRect.height + 'px';
  };
}
