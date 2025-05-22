import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { HeaderComponent } from './header.component';

@NgModule({
    declarations: [HeaderComponent],
    imports: [RouterModule, CommonModule, NzButtonModule, NzIconModule, NzBreadCrumbModule],
    exports: [HeaderComponent],
})
export class HeaderModule {}
