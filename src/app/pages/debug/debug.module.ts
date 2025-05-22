import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DebugComponent } from './debug.component';
import { NgJsonEditorModule } from 'ang-jsoneditor';
import { NzButtonModule } from 'ng-zorro-antd/button';

const routes: Routes = [
    {
        path: '',
        component: DebugComponent,
    },
];

@NgModule({
    declarations: [DebugComponent],
    imports: [CommonModule, NgJsonEditorModule, RouterModule.forChild(routes), NzButtonModule],
})
export class DebugModule {}
