import { Component } from '@angular/core';
import { TranslateService } from './../../../services/translate/translate.service';

@Component({
               selector: 'app-dialog-delete-single-annotation',
               templateUrl: './dialog-delete-single-annotation.component.html',
               styleUrls: ['./dialog-delete-single-annotation.component.scss'],
           })
export class DialogDeleteSingleAnnotationComponent {

    constructor (private translate: TranslateService) {
        this.translate.use(window.navigator.language.split("-")[0]);
    }

    public username = '';
    public password = '';

    public login() {
    }

    public withoutlogin() {
        console.log(`username: ${this.username}`);
    }
}
