import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NzNotificationModule } from 'ng-zorro-antd/notification';
import { AuthorizedGuard } from './guards/authorized.guard';
import { NotAuthorizedGuard } from './guards/not-authorized.guard';
import { AccountService } from './services/account.service';
import { StorageService } from './services/storage.service';

@NgModule({
    declarations: [],
    imports: [CommonModule, NzNotificationModule],
    providers: [AccountService, StorageService, AuthorizedGuard, NotAuthorizedGuard],
})
export class CoreModule {}
