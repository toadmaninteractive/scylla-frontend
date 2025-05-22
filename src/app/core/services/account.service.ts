import { Injectable } from '@angular/core';
import { BehaviorSubject, finalize, Observable, of, tap } from 'rxjs';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { ScyllaAuthService } from '../../protocol/auth.service';
import { LoginRequest, UserProfile } from '../../protocol/web';

@Injectable({
    providedIn: 'root',
})
export class AccountService {
    initialized$ = new BehaviorSubject<boolean>(false);
    isSignedIn$ = new BehaviorSubject(false);
    profile$ = new BehaviorSubject<UserProfile | null>(null);

    constructor(private authService: ScyllaAuthService, private notificationService: NzNotificationService) {
        this.initialize();
    }

    initialize(): void {
        this.initialized$.next(false);
        this.authService
            .getMyProfile()
            .pipe(
                tap((profile) =>
                    profile instanceof UserProfile ? this.profile$.next(profile) : this.profile$.next(null)
                ),
                tap((profile) => this.isSignedIn$.next(profile instanceof UserProfile)),
                finalize(() => this.initialized$.next(true))
            )
            .subscribe({
                error: () => {},
                // this.notificationService.error(
                //     'Authentication error',
                //     'You are not logged in or session has expired. Please sign in again.'
                // ),
            });
    }

    signIn(username: string, password: string): Observable<UserProfile | null> {
        const request = new LoginRequest();
        request.username = username;
        request.password = password;

        return this.authService.login(request).pipe(
            tap((res) => {
                if (res instanceof UserProfile) {
                    this.isSignedIn$.next(true);
                    return res;
                }
                return of(null);
            })
        );
    }

    signOut(): Observable<void> {
        return this.authService.logout().pipe(tap(() => this.isSignedIn$.next(false)));
    }
}
