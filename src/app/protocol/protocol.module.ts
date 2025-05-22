import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScyllaAuthService } from './auth.service';
import { ScyllaIngestionService } from './ingest.service';

@NgModule({
    imports: [CommonModule],
    declarations: [],
    exports: [],
    providers: [ScyllaAuthService, ScyllaIngestionService],
})
export class ProtocolModule {
    constructor(@Optional() @SkipSelf() parentModule: ProtocolModule) {
        if (parentModule) {
            throw new Error('ProtocolModule is already loaded. Import it in the AppModule only');
        }
    }
}
