import {
    AfterViewInit,
    Component,
    HostListener,
    ViewContainerRef,
} from '@angular/core';
import {MatDialog} from '@angular/material';

import {AnnotationService} from '../../services/annotation/annotation.service';
import {BabylonService} from '../../services/babylon/babylon.service';
import {MongohandlerService} from '../../services/mongohandler/mongohandler.service';
import {ProcessingService} from '../../services/processing/processing.service';
import {LoginComponent} from '../dialogs/dialog-login/login.component';

@Component({
    selector: 'app-scene',
    templateUrl: './scene.component.html',
    styleUrls: ['./scene.component.scss'],
})
export class SceneComponent implements AfterViewInit {
    // show or not show menu
    public isLightMode = true;
    private firstAttempt = true;

    @HostListener('window:resize', ['$event'])
    public onResize() {
        this.babylonService.resize();
    }

    constructor(
        private babylonService: BabylonService,
        private processingService: ProcessingService,
        public annotationService: AnnotationService,
        private viewContainerRef: ViewContainerRef,
        private dialog: MatDialog,
        private mongo: MongohandlerService,
    ) {
    }

    private loginAttempt() {
        this.mongo
            .isAuthorized()
            .then(result => {
                if (result.status === 'ok') {
                    this.setupCanvas();
                } else {
                    if (this.firstAttempt) {
                        // Show Login Screen before loading Babylon
                        this.openLoginDialog();
                    } else {
                        // Assume user is not interested in logging in
                        this.setupCanvas();
                    }
                }
            })
            .catch(e => {
                // Server might not be reachable, skip login
                console.error(e);
                this.setupCanvas();
            });
    }

    private openLoginDialog() {
        this.firstAttempt = false;
        this.dialog
            .open(LoginComponent)
            .afterClosed()
            .toPromise()
            .then(() => this.loginAttempt())
            .catch(e => {
                console.error(e);
                this.loginAttempt();
            });
    }

    private setupCanvas() {
        this.babylonService.attachCanvas(this.viewContainerRef);
        this.babylonService.resize();
        this.processingService.bootstrap();
    }

    ngAfterViewInit() {
        this.processingService.lightMode.subscribe(isLightMode => {
            this.isLightMode = isLightMode;
        });

        const searchParams = location.search;
        const queryParams = new URLSearchParams(searchParams);
        const entityParam = queryParams.get('model') || queryParams.get('entity');
        const compParam = queryParams.get('compilation');
        // values = dragdrop, explore, edit, annotation, ilias, full
        const mode = queryParams.get('mode');

        const loadingCase = entityParam !== null || undefined ? 'entity' :
            (compParam !== null || undefined ? 'collection' : 'default');

        if (loadingCase === 'collection' && mode === 'ilias' ||
            mode === 'fullLoad' ||
            loadingCase === 'entity' && mode === 'annotation' ||
            loadingCase === 'collection' && mode === 'annotation' ||
            loadingCase === 'entity' && mode === 'edit') {
            this.loginAttempt();
        } else {
            this.setupCanvas();
        }
    }
}
