import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, take, takeUntil } from 'rxjs';
import { AccountService } from '../../core/services/account.service';
import { Breadcrumb, BreadcrumbsService } from '../../core/services/breadcrumbs.service';

@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent implements OnDestroy {
    destroy$ = new Subject<void>();

    constructor(
        public accountService: AccountService,
        private router: Router,
        public breadcrumbsService: BreadcrumbsService
    ) {}

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    signOut(): void {
        this.accountService
            .signOut()
            .pipe(take(1), takeUntil(this.destroy$))
            .subscribe({
                next: () => this.router.navigate(['/login']),
                error: (error) => console.log(error),
            });
    }

    getLink(br: Breadcrumb[], index: number, label: string): Array<string> | null {
        if (index + 1 === br.length) return null;
        return ['/'].concat(br.slice(0, index + 1).map((br) => br.link));
    }
}
