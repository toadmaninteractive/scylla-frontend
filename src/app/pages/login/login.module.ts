import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login.component';
import { InlineSVGModule } from "ng-inline-svg-2";
import { NzFormModule } from "ng-zorro-antd/form";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzIconModule } from "ng-zorro-antd/icon";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { NzAlertModule } from "ng-zorro-antd/alert";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzTypographyModule } from "ng-zorro-antd/typography";

const routes: Routes = [
    {
        path: '',
        component: LoginComponent,
    },
];

@NgModule({
    declarations: [LoginComponent],
    imports: [CommonModule, RouterModule.forChild(routes), InlineSVGModule, NzFormModule, NzInputModule, NzIconModule, FormsModule, NzAlertModule, NzButtonModule, NzTypographyModule, ReactiveFormsModule],
})
export class LoginModule {}
