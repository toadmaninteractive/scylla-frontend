import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { PagesRoutingModule } from '../pages/pages-routing.module';
import { FooterComponent } from './footer/footer.component';
import { MenuComponent } from './menu/menu.component';

@NgModule({
    declarations: [MenuComponent, FooterComponent],
    imports: [
        CommonModule,
        NzMenuModule,
        NzIconModule,
        PagesRoutingModule,
        InlineSVGModule,
        NzButtonModule,
        NzToolTipModule,
    ],
    exports: [MenuComponent, FooterComponent],
})
export class ComponentsModule {}
