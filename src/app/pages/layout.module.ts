import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { ComponentsModule } from '../components/components.module';
import { HeaderModule } from '../components/header/header.module';
import { SharedModule } from '../shared/shared.module';
import { LayoutComponent } from './layout/layout.component';
import { PagesRoutingModule } from './pages-routing.module';

@NgModule({
    declarations: [LayoutComponent],
    imports: [
        CommonModule,
        HeaderModule,
        PagesRoutingModule,
        InlineSVGModule,
        NzLayoutModule,
        NzMenuModule,
        ComponentsModule,
        NzIconModule,
        NzButtonModule,
        SharedModule,
    ],
    exports: [],
})
export class LayoutModule {}
