import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzTableModule } from 'ng-zorro-antd/table';
import { SharedModule } from '../../shared/shared.module';
import { ClickhouseConnectionsComponent } from './clickhouse-connections.component';
import { EditConnectionComponent } from './edit-connection/edit-connection.component';

const routes: Routes = [
    {
        path: 'create',
        component: EditConnectionComponent,
        data: {
            breadcrumb: 'Create instance',
        },
    },
    {
        path: ':code',
        redirectTo: ':code/edit',
    },
    {
        path: ':code/edit',
        component: EditConnectionComponent,
        data: {
            breadcrumb: 'Edit instance',
        },
    },
    {
        path: '',
        component: ClickhouseConnectionsComponent,
    },
];

@NgModule({
    declarations: [ClickhouseConnectionsComponent, EditConnectionComponent],
    imports: [
        CommonModule,
        RouterModule,
        RouterModule.forChild(routes),
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatMenuModule,
        MatTableModule,
        MatTooltipModule,
        ReactiveFormsModule,
        NzButtonModule,
        NzCardModule,
        NzInputModule,
        NzIconModule,
        NzFormModule,
        NzModalModule,
        NzTableModule,
        NzBreadCrumbModule,
        SharedModule,
    ],
})
export class ClickhouseConnectionsModule {}
