import { Component } from '@angular/core';

@Component({
               selector: 'app-dialog-delete-single-annotation',
               templateUrl: './dialog-delete-single-annotation.component.html',
               styleUrls: ['./dialog-delete-single-annotation.component.scss'],
           })
export class DialogDeleteSingleAnnotationComponent {
    public username = '';
    public password = '';

    public login() {
    }

    public withoutlogin() {
        console.log(`username: ${this.username}`);
    }
}
