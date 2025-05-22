import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';

const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'projects',
        data: {
            animation: 'routeTransitionAnimations',
        },
    },

    {
        path: '',
        component: LayoutComponent,
        children: [
            {
                path: 'projects',
                loadChildren: () => import('./projects/projects.module').then((m) => m.ProjectsModule),
                data: {
                    animation: 'playAnimationDashboard',
                    breadcrumb: 'Projects',
                },
            },
            {
                path: 'clickhouse',
                loadChildren: () =>
                    import('./clickhouse-connections/clickhouse-connections.module').then(
                        (m) => m.ClickhouseConnectionsModule
                    ),
                data: {
                    animation: 'playAnimationDashboard',
                    breadcrumb: 'Clickhouse instances',
                },
            },
            {
                path: 'login',
                loadChildren: () => import('./login/login.module').then((m) => m.LoginModule),
                data: {
                    animation: 'playAnimationDashboard',
                    breadcrumb: 'Login',
                },
            },
            {
                path: 'debug',
                loadChildren: () => import('./debug/debug.module').then((m) => m.DebugModule),
                data: {
                    animation: 'playAnimationDashboard',
                    breadcrumb: 'Debug',
                },
            },
            {
                path: '**',
                redirectTo: '404',
            },
        ],
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class PagesRoutingModule {}
