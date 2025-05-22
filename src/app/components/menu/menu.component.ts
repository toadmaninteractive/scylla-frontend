import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import { BehaviorSubject, filter, map, tap } from 'rxjs';
import { AccountService } from '../../core/services/account.service';
import { Menu } from './menu.config';

@Component({
    selector: 'app-menu',
    templateUrl: './menu.component.html',
    styleUrls: ['./menu.component.scss'],
})
export class MenuComponent implements OnInit, OnDestroy {
    @Input() collapsed = false;
    currentMenuItem$ = new BehaviorSubject<string>('dd');
    menuItems = Menu;

    constructor(public accountService: AccountService, private router: Router, private route: ActivatedRoute) {}

    ngOnInit(): void {
        // For initial menu item value
        this.currentMenuItem$.next(this.router.url.split('/')[1]);

        this.router.events
            .pipe(
                filter((event) => event instanceof NavigationStart),
                map((event) => (event as NavigationStart).url),
                map((url) => url.split('/')[1]),
                map((url) => (url !== '' ? url : 'projects'))
            )
            .subscribe((url) => this.currentMenuItem$.next(url));
    }

    ngOnDestroy(): void {
        this.currentMenuItem$.complete();
    }
}
