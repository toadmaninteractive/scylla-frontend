import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, combineLatest, map, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzColumn } from '../../core/interfaces/nz-column.interface';
import { AccountService } from '../../core/services/account.service';
import { BreadcrumbsService } from '../../core/services/breadcrumbs.service';
import * as Igor from '../../protocol/igor';
import { ScyllaManagementService } from '../../protocol/management.service';
import { Schema } from '../../protocol/schema';
import { Project, ProjectEventValidation } from '../../protocol/web';

@Component({
    selector: 'app-projects',
    templateUrl: './projects.component.html',
    styleUrls: ['./projects.component.scss'],
})
export class ProjectsComponent implements OnInit, OnDestroy {
    destroy$ = new Subject();
    projects$ = new BehaviorSubject<Project[]>([]);
    projectsDisplayed$ = new BehaviorSubject<Project[]>([]);
    refresh$ = new BehaviorSubject<boolean>(false);
    displayedColumns: NzColumn<Project>[] = [
        {
            name: 'Name',
            sortOrder: 'ascend',
            sortFn: (a: Project, b: Project) => (a.name > b.name ? 1 : -1),
            sortDirections: ['ascend', 'descend', null],
        },

        {
            name: 'Code',
            sortOrder: null,
            sortFn: (a: Project, b: Project) => (a.code > b.code ? 1 : -1),
            sortDirections: ['ascend', 'descend', null],
        },

        {
            name: 'Schema',
            sortOrder: null,
            sortFn: null,
            sortDirections: null,
        },

        {
            name: 'Storage',
            sortOrder: null,
            sortFn: null,
            sortDirections: null,
        },

        {
            name: 'Properties',
            sortOrder: null,
            sortFn: null,
            sortDirections: null,
        },

        {
            name: 'Created At',
            sortOrder: null,
            sortFn: (a: Project, b: Project) => (a.createdAt > b.createdAt ? 1 : -1),
            sortDirections: ['ascend', 'descend', null],
        },

        {
            name: 'Updated At',
            sortOrder: null,
            sortFn: (a: Project, b: Project) => (a.updatedAt > b.updatedAt ? 1 : -1),
            sortDirections: ['ascend', 'descend', null],
        },

        {
            name: 'Actions',
            sortOrder: null,
            sortFn: null,
            sortDirections: null,
        },
    ];
    widthConfig = ['200px', '125px', '115px', '314px', '100px', '135px', '135px', '90px'];
    eventMap = new Map<number, number>();
    eventValidationEnum = ProjectEventValidation;

    projectsFilter = new FormControl('');

    constructor(
        private accountService: AccountService,
        private managementService: ScyllaManagementService,
        private modal: NzModalService,
        private notificationService: NzNotificationService,
        private brService: BreadcrumbsService,
        private route: ActivatedRoute
    ) {}

    ngOnInit(): void {
        this.brService.setBreadcrumbs([{ label: 'Projects', link: 'project' }]);

        this.refresh$
            .asObservable()
            .pipe(
                takeUntil(this.destroy$),
                switchMap(() =>
                    this.managementService.getProjects().pipe(
                        takeUntil(this.destroy$),
                        map((response) => response.items),
                        tap((projects: Project[]) =>
                            projects.forEach((p) =>
                                this.eventMap.set(
                                    p.id,
                                    this.countEvents(typeof p.schema === 'string' ? JSON.parse(p.schema) : p.schema)
                                )
                            )
                        )
                    )
                )
            )
            .subscribe((projects) => {
                this.projects$.next(projects);
                this.projectsDisplayed$.next(projects);
            });

        combineLatest([this.projectsFilter.valueChanges, this.projects$.asObservable()])
            .pipe(
                takeUntil(this.destroy$),
                map(([needle, projects]: [string, Project[]]) =>
                    projects.filter((project) => project.name.toLocaleLowerCase().includes(needle.toLocaleLowerCase()))
                )
            )
            .subscribe((projects) => this.projectsDisplayed$.next(projects));
    }

    countEvents(schema: object | Igor.Json.JsonValue): number {
        try {
            const docType = schema['document_type'];
            const tag = schema['custom_types'][docType]['tag'];
            const enumNode = schema['custom_types'][docType]['fields'][tag]['name'];
            return schema['custom_types'][enumNode]['values'].length;
        } catch (e) {
            return 0;
        }
    }

    onDelete(project: Project): void {
        this.modal.confirm({
            nzTitle: `Do you want to delete <b>${project.name}</b> project?`,
            nzContent: '',
            nzOnOk: () => this.deleteProject(project.id),
        });
    }

    deleteProject(id: number) {
        this.managementService
            .deleteProject(id.toString())
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.refresh$.next(true);
                    this.notificationService.success('Deleted', `Project with ${id} id has been deleted!`);
                },
                error: (error) => this.notificationService.error('Error', error?.message || 'Unknown error'),
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next(null);
        this.destroy$.complete();
        this.projectsDisplayed$.complete();

        this.projects$.complete();
        this.refresh$.complete();
    }
}
