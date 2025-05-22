import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Subject, take, takeUntil } from 'rxjs';
import { AccountService } from '../../core/services/account.service';
import { StorageService } from '../../core/services/storage.service';
import { UserProfile } from '../../protocol/web';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnDestroy {
    isPasswordVisible = false;
    password?: string;

    destroy$ = new Subject<void>();
    hasError$ = new BehaviorSubject<boolean>(false);

    constructor(
        private accountService: AccountService,
        private storageService: StorageService,
        private router: Router
    ) {}

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.hasError$.complete();
    }

    signIn(username: string, password: string): void {
        this.accountService
            .signIn(username, password)
            .pipe(take(1), takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                    if (res instanceof UserProfile) {
                        const storedRoute = this.storageService.getStoredRoute()
                            ? this.storageService.getStoredRoute()
                            : '/';
                        void this.router.navigate([storedRoute]);
                    }
                },
                error: () => {
                    this.hasError$.next(true);
                },
            });
    }
}
