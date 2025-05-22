import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class StorageService {
    constructor(private router: Router) {
        router.events
            .pipe(filter((event) => event instanceof NavigationEnd && event.urlAfterRedirects !== '/login'))
            .subscribe((event) => this.setStoredRoute(event instanceof NavigationEnd ? event.urlAfterRedirects : ''));
    }

    getStoredRoute(): string | null {
        return localStorage.getItem('storedRouteKey') || null;
    }

    setStoredRoute(url: string): void {
        localStorage.setItem('storedRouteKey', url);
    }

    resetStoredRoute(): void {
        localStorage.removeItem('storedRouteKey');
    }
}
