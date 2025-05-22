import { Component, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { routeTransitionAnimations } from '../../animations';

@Component({
    selector: 'app-layout',
    templateUrl: './layout.component.html',
    styleUrls: ['./layout.component.scss'],
    animations: [routeTransitionAnimations],
})
export class LayoutComponent implements OnDestroy {
    menuIsCollapsed$ = new BehaviorSubject<boolean>(false);

    ngOnDestroy() {
        this.menuIsCollapsed$.complete();
    }

    onMenuToggleCLick(value: boolean) {
        this.menuIsCollapsed$.next(!value);
    }

    prepareRoute(outlet: RouterOutlet) {
        return outlet.activatedRouteData;
    }
}
