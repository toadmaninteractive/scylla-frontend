import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthorizedGuard } from './core/guards/authorized.guard';
import { NotAuthorizedGuard } from './core/guards/not-authorized.guard';

const routes: Routes = [
    {
        path: '404',
        loadChildren: () => import('./pages/error/error.module').then((m) => m.ErrorModule),
    },
    {
        path: 'login',
        loadChildren: () => import('./pages/login/login.module').then((m) => m.LoginModule),
        canActivate: [NotAuthorizedGuard],
    },
    {
        path: '',
        loadChildren: () => import('./pages/layout.module').then((m) => m.LayoutModule),
        canActivate: [AuthorizedGuard],
    },
    {
        path: '**',
        redirectTo: '404',
    },
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule],
})
export class AppRoutingModule {}
