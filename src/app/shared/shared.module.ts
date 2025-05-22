import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { StringCensorship } from './pipes/stringСensorship.pipe';

@NgModule({
    declarations: [StringCensorship],
    exports: [StringCensorship],
    imports: [CommonModule],
})
export class SharedModule {}
