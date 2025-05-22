import { CdkTableModule } from '@angular/cdk/table';
import { CommonModule, DatePipe } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgJsonEditorModule } from 'ang-jsoneditor';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzNotificationModule } from 'ng-zorro-antd/notification';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzTreeModule } from 'ng-zorro-antd/tree';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { DiscoverSchemaComponent } from './edit-project/discover-schema/discover-schema.component';
import { EditProjectComponent } from './edit-project/edit-project.component';
import { EventsListComponent } from './edit-project/events-list/events-list.component';
import { MigrationsListComponent } from './edit-project/migrations-list/migrations-list.component';
import { SneakPeakComponent } from './edit-project/sneak-peak/sneak-peak.component';
import { UploadSchemaComponent } from './edit-project/upload-schema/upload-schema.component';
import { ProjectsComponent } from './projects.component';
import { SchemaComponent } from './schema/schema.component';

const routes: Routes = [
    {
        path: 'create',
        component: EditProjectComponent,
        data: {
            breadcrumb: 'Create project',
        },
    },

    {
        path: 'projects',
        component: ProjectsComponent,
        data: {
            breadcrumb: 'Projects',
        },
        children: [],
    },

    {
        path: ':code',
        redirectTo: ':code/preferences',
    },

    {
        path: ':code',
        children: [
            {
                path: 'preferences',
                component: EditProjectComponent,
                data: {
                    breadcrumb: 'Preferences',
                },
            },

            {
                path: 'events',
                component: EditProjectComponent,
                data: {
                    breadcrumb: 'Events',
                },
            },

            {
                path: 'discover',
                component: EditProjectComponent,
                data: {
                    breadcrumb: 'Discover schema',
                },
            },

            {
                path: 'upload',
                component: EditProjectComponent,
                data: {
                    breadcrumb: 'Upload schema',
                },
            },

            {
                path: 'migrations',
                component: EditProjectComponent,
                data: {
                    breadcrumb: 'Migrations',
                },
            },
            {
                path: 'peek',
                component: EditProjectComponent,
                data: {
                    breadcrumb: 'Sneak Peek',
                },
            },

            {
                path: 'schema',
                component: SchemaComponent,
                data: {
                    breadcrumb: 'Schema',
                },
            },
        ],
    },

    {
        path: '',
        component: ProjectsComponent,
        data: {
            breadcrumb: 'Projects',
        },
        children: [],
    },
];

@NgModule({
    declarations: [
        DiscoverSchemaComponent,
        EditProjectComponent,
        EventsListComponent,
        ProjectsComponent,
        SchemaComponent,
        SneakPeakComponent,
        UploadSchemaComponent,
        MigrationsListComponent,
    ],
    providers: [DatePipe],
    imports: [
        CommonModule,
        MatListModule,
        MatSelectModule,
        NgJsonEditorModule,
        RouterModule.forChild(routes),
        MatMenuModule,
        MatButtonModule,
        InlineSVGModule,
        MatTableModule,
        MatIconModule,
        MatTooltipModule,
        MatFormFieldModule,
        MatInputModule,
        CdkTableModule,
        FormsModule,
        ReactiveFormsModule,

        NzBreadCrumbModule,
        NzButtonModule,
        NzCardModule,
        NzCheckboxModule,
        NzCollapseModule,
        NzDividerModule,
        NzFormModule,
        NzIconModule,
        NzInputModule,
        NzInputNumberModule,
        NzSelectModule,
        NzModalModule,
        NzNotificationModule,
        NzRadioModule,
        NzTableModule,
        NzTabsModule,
        NzTreeModule,
        NzToolTipModule,
        NzSpinModule,
        NzSwitchModule,
        NzUploadModule,
        NzTagModule,
    ],
})
export class ProjectsModule {}
