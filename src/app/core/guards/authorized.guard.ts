import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { filter, map, Observable, switchMap } from 'rxjs';
import { AccountService } from '../services/account.service';
import { StorageService } from '../services/storage.service';

@Injectable({
    providedIn: 'root',
})
export class AuthorizedGuard implements CanActivate {
    constructor(
        private accountService: AccountService,
        private storageService: StorageService,
        private router: Router
    ) {}

    canActivate(): Observable<boolean | UrlTree> {
        return this.accountService.initialized$.pipe(
            filter((initialized) => !!initialized),
            switchMap(() => this.accountService.isSignedIn$),
            map((signedIn: boolean) => (signedIn ? true : this.router.parseUrl('/login')))
        );
    }
}
