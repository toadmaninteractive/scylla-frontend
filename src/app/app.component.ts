import { Component } from '@angular/core';
import { ScyllaIngestionService } from 'src/app/protocol/ingest.service';
import { environment } from '../environments/environment';
import { ScyllaAuthService } from './protocol/auth.service';
import { ScyllaManagementService } from './protocol/management.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent {
    constructor(
        private authService: ScyllaAuthService,
        private managementService: ScyllaManagementService,
        private ingestionService: ScyllaIngestionService
    ) {
        if (!environment.production && environment.authUrl) {
            authService.baseUrl = environment.authUrl;
        }
        if (!environment.production && environment.manageUrl) {
            managementService.baseUrl = environment.manageUrl;
        }
        if (!environment.production && environment.ingestUrl) {
            ingestionService.baseUrl = environment.ingestUrl;
        }
    }
}
