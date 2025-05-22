import { Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, map, Subject, switchMap, take, takeUntil } from 'rxjs';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzColumn } from '../../core/interfaces/nz-column.interface';
import { BreadcrumbsService } from '../../core/services/breadcrumbs.service';
import { ScyllaManagementService } from '../../protocol/management.service';
import { ClickhouseInstance } from '../../protocol/web';

@Component({
    selector: 'app-clickhouse-connections',
    templateUrl: 'clickhouse-connections.component.html',
    styleUrls: ['./clickhouse-connections.component.scss'],
})
export class ClickhouseConnectionsComponent implements OnInit, OnDestroy {
    destroy$ = new Subject();
    clickhouseInstances$ = new BehaviorSubject<ClickhouseInstance[]>([]);
    refresh$ = new BehaviorSubject<boolean>(false);

    displayedColumns: NzColumn<ClickhouseInstance>[] = [
        {
            name: 'Name',
            sortOrder: 'ascend',
            sortFn: (a: ClickhouseInstance, b: ClickhouseInstance) => (a.name > b.name ? 1 : -1),
            sortDirections: ['ascend', 'descend', null],
        },

        {
            name: 'Code',
            sortOrder: null,
            sortFn: (a: ClickhouseInstance, b: ClickhouseInstance) => (a.code > b.code ? 1 : -1),
            sortDirections: ['ascend', 'descend', null],
        },

        {
            name: 'URL',
            sortOrder: null,
            sortFn: null,
            sortDirections: null,
        },

        {
            name: 'Username',
            sortOrder: null,
            sortFn: null,
            sortDirections: null,
        },

        {
            name: 'Created At',
            sortOrder: null,
            sortFn: (a: ClickhouseInstance, b: ClickhouseInstance) => (a.createdAt > b.createdAt ? 1 : -1),
            sortDirections: ['ascend', 'descend', null],
        },

        {
            name: 'Updated At',
            sortOrder: null,
            sortFn: (a: ClickhouseInstance, b: ClickhouseInstance) => (a.updatedAt > b.updatedAt ? 1 : -1),
            sortDirections: ['ascend', 'descend', null],
            width: '200px',
        },

        {
            name: 'Actions',
            sortOrder: null,
            sortFn: null,
            sortDirections: null,
        },
    ];

    widthConfig = ['200px', '200px', '192px', '175px', '175px', '175px', '90px'];

    constructor(
        private brService: BreadcrumbsService,
        private managementService: ScyllaManagementService,
        private notificationService: NzNotificationService,
        private modal: NzModalService
    ) {}

    ngOnInit(): void {
        this.brService.setBreadcrumbs([{ label: 'Clickhouse', link: 'clickhouse' }]);

        this.refresh$
            .pipe(
                takeUntil(this.destroy$),
                switchMap(() =>
                    this.managementService.getClickhouseInstances().pipe(
                        takeUntil(this.destroy$),
                        map((collection) => collection.items)
                    )
                )
            )
            .subscribe((chInstance) => this.clickhouseInstances$.next(chInstance));
    }

    ngOnDestroy(): void {
        this.destroy$.next(null);
        this.destroy$.complete();
        this.clickhouseInstances$.complete();
        this.refresh$.complete();
    }

    onDelete(instance: ClickhouseInstance): void {
        this.modal.confirm({
            nzTitle: `Do you want to delete <b>${instance.name}</b> instance?`,
            nzContent: '',
            nzOnOk: () => this.deleteInstance(instance.id),
        });
    }

    deleteInstance(id: number): void {
        this.managementService
            .deleteClickhouseInstance(id.toString())
            .pipe(takeUntil(this.destroy$), take(1))
            .subscribe({
                next: () => {
                    this.notificationService.success('Clickhouse instance has been removed', '');
                    this.refresh$.next(true);
                },
                error: (error) => this.notificationService.error('Error', error?.message || 'Unknown error'),
            });
    }
}
