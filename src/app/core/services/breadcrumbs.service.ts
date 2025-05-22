import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Breadcrumb {
    label: string;
    link: string;
}

@Injectable({
    providedIn: 'root',
})
export class BreadcrumbsService {
    breadcrumbs$ = new BehaviorSubject<Breadcrumb[]>([]);
    private breadcrumbs: Breadcrumb[] = [];

    addBreadcrumb(breadcrumb: Breadcrumb): void {
        this.breadcrumbs.push(breadcrumb);
        this.breadcrumbs$.next(this.breadcrumbs);
    }

    removeLastBreadcrumb(): void {
        this.breadcrumbs.pop();
        this.breadcrumbs$.next(this.breadcrumbs);
    }

    setBreadcrumbs(br: Breadcrumb[]): void {
        this.breadcrumbs = br;
        this.breadcrumbs$.next(this.breadcrumbs);
    }

    clearBreadcrumbs(): void {
        this.breadcrumbs = [];
        this.breadcrumbs$.next([]);
    }
}
