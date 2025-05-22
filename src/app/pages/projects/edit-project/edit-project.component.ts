import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import {
    AbstractControl,
    FormBuilder,
    FormControl,
    FormGroup,
    ValidationErrors,
    ValidatorFn,
    Validators,
} from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import {
    BehaviorSubject,
    combineLatest,
    filter,
    map,
    of,
    startWith,
    Subject,
    switchMap,
    take,
    takeUntil,
    tap,
} from 'rxjs';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzTabChangeEvent } from 'ng-zorro-antd/tabs';
import { BreadcrumbsService } from '../../../core/services/breadcrumbs.service';
import { Empty } from '../../../protocol/data';
import { ScyllaIngestionService } from '../../../protocol/ingest.service';
import { ScyllaManagementService } from '../../../protocol/management.service';
import { Schema } from '../../../protocol/schema';
import {
    ClickhouseInstance,
    CreateProjectRequest,
    Project,
    ProjectEventValidation,
    UpdateProjectRequest,
} from '../../../protocol/web';

enum Field {
    Name = 'name',
    Code = 'code',
    ClickhouseDb = 'clickhouseDb',
    ClickhouseInstanceId = 'clickhouseInstanceId',
    Description = 'description',
    EventValidation = 'eventValidation',
    PreserveDBColumns = 'preserveDbColumns',
    BackupMode = 'backupMode',
}

enum Key {
    rw = 'key_rw',
    su = 'key_su',
}

enum Tab {
    Preferences,
    Events,
    Discover,
    Upload,
    Migrations,
    Peek,
}

@Component({
    selector: 'app-edit-project',
    templateUrl: './edit-project.component.html',
    styleUrls: ['./edit-project.component.scss'],
})
export class EditProjectComponent implements OnInit, OnDestroy {
    destroy$ = new Subject();
    projectId$ = new BehaviorSubject<number | null>(null);
    chInstances$ = new BehaviorSubject<ClickhouseInstance[]>([]);
    refresh$ = new BehaviorSubject<boolean>(false);
    isChanged$ = new BehaviorSubject<boolean>(false);
    pristineProject: Project | null = null;
    patch$ = new BehaviorSubject<UpdateProjectRequest | CreateProjectRequest | null>(null);
    project$ = new BehaviorSubject<Project | null>(null);
    isEditProject$ = new BehaviorSubject<boolean>(false);
    schema$ = new BehaviorSubject<Schema | null>(null);

    activeTab: Tab = Tab.Preferences;
    field = Field;
    key = Key;
    form = this.initForm(null);
    project: Project | null = null;
    eventValidationEnum = ProjectEventValidation;
    eventValValues = Object.keys(ProjectEventValidation)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        .filter((kind) => typeof ProjectEventValidation[kind as any] === 'number')
        .map((k) => ProjectEventValidation[k] as number);

    constructor(
        private cdr: ChangeDetectorRef,
        private route: ActivatedRoute,
        private router: Router,
        private fb: FormBuilder,
        private brService: BreadcrumbsService,
        private ingestionService: ScyllaIngestionService,
        private managementService: ScyllaManagementService,
        private notification: NzNotificationService,
        private location: Location
    ) {}

    ngOnInit(): void {
        combineLatest([
            this.route.paramMap,
            this.refresh$.asObservable(),
            this.router.events.pipe(
                filter((event) => event instanceof NavigationEnd),
                startWith('')
            ),
        ])
            .pipe(
                takeUntil(this.destroy$),
                filter(([paramMap, _]) => paramMap.has('code')),
                map(([paramMap, _]) => paramMap.get('code')),
                tap(() => this.patch$.next(new UpdateProjectRequest())),
                tap(() => this.isEditProject$.next(true)),
                switchMap((code) => this.managementService.getProject(code.toString())),
                tap((project: Project) => this.project$.next(project)),
                tap((project: Project) => this.projectId$.next(project.id)),
                tap(() => this.setActiveTab()),
                tap((project: Project) =>
                    this.brService.setBreadcrumbs([
                        {
                            label: 'Projects',
                            link: 'projects',
                        },
                        { label: project.name, link: project.code },
                        { label: Tab[this.activeTab], link: Tab[this.activeTab].toLowerCase() },
                    ])
                ),
                filter((project: Project) => !!project.schema),

                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                map((project: Project) =>
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                    Schema.fromJson(typeof project.schema === 'string' ? JSON.parse(project.schema) : project.schema)
                )
            )
            .subscribe({
                // @ts-ignore
                next: (schema) => this.schema$.next(schema),
                error: () => this.notification.error('Not Valid Schema', 'failed to parse schema'),
            });

        this.route.paramMap
            .pipe(
                takeUntil(this.destroy$),
                filter((paramMap) => !paramMap.has('code'))
            )
            .subscribe(() => {
                this.patch$.next(new CreateProjectRequest());
                this.isEditProject$.next(false);
            });

        this.managementService
            .getClickhouseInstances()
            .pipe(
                takeUntil(this.destroy$),
                map((collection) => collection.items)
            )
            .subscribe((chInstances) => this.chInstances$.next(chInstances));

        combineLatest([this.projectId$.asObservable(), this.refresh$.asObservable()])
            .pipe(
                takeUntil(this.destroy$),
                switchMap(([id, _]) => (id ? this.managementService.getProject(id.toString()) : of(null))),
                tap((project) => (this.pristineProject = project ? project : new Project())),
                tap((project) => (this.project = project ? project : new Project())),
                map((project) => this.initForm(project)),
                tap((form) => (this.form = form)),
                switchMap((form) => combineLatest([form.valueChanges, this.projectId$.asObservable()])),
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                map(([formData, id]) => this.makePatch(this.pristineProject, formData, id)),
                filter((patch) => {
                    const isNotEmptyPatch = Object.values(patch).filter((field) => field !== undefined).length > 0;
                    this.isChanged$.next(isNotEmptyPatch);
                    return isNotEmptyPatch;
                })
            )
            .subscribe((patch) => {
                this.patch$.next(patch);
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next(null);
        this.destroy$.complete();
        this.projectId$.complete();
        this.isChanged$.complete();
        this.chInstances$.complete();
        this.refresh$.complete();
        this.patch$.complete();
    }

    dbNameValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            // valid db start with letter and any further, including underline except special symbols
            const pattern = new RegExp('^[a-z][a-z0-9_]*$');
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-argument
            if (control.value.toString() && !pattern.test(control.value.toString())) {
                return { confirm: false, warning: true };
            }
            return {};
        };
    }

    initForm(project: Project | null): FormGroup {
        return this.fb.group({
            [Field.Name]: new FormControl(project?.[Field.Name] ?? '', Validators.required),
            [Field.Code]: new FormControl(project?.[Field.Code] ?? '', Validators.required),
            [Field.ClickhouseInstanceId]: new FormControl(project?.clickhouseInstanceId ?? null, Validators.required),
            [Field.ClickhouseDb]: new FormControl(project?.[Field.ClickhouseDb] ?? '', [
                Validators.required,
                this.dbNameValidator(),
            ]),
            [Field.Description]: new FormControl(project?.[Field.Description] ?? ''),
            [Field.EventValidation]: new FormControl(project?.[Field.EventValidation] ?? ProjectEventValidation.Strict),
            [Field.PreserveDBColumns]: new FormControl(project?.[Field.PreserveDBColumns] ?? false),
            [Field.BackupMode]: new FormControl(project?.[Field.BackupMode] ?? false),
        });
    }

    makePatch(
        pristineProject: Project | null,
        formData: { Field: any },
        projectId: number | null
    ): CreateProjectRequest | UpdateProjectRequest {
        const request = projectId ? new UpdateProjectRequest() : new CreateProjectRequest();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        request[Field.Name] =
            pristineProject && (pristineProject[Field.Name] ?? '') !== formData[Field.Name]
                ? formData[Field.Name]
                : undefined;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        request[Field.Code] =
            pristineProject && (pristineProject[Field.Code] ?? '') !== formData[Field.Code]
                ? formData[Field.Code]
                : undefined;
        request[Field.ClickhouseInstanceId] =
            pristineProject &&
            (pristineProject[Field.ClickhouseInstanceId] ?? 0) !== formData[Field.ClickhouseInstanceId]
                ? +formData[Field.ClickhouseInstanceId]
                : undefined;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        request[Field.ClickhouseDb] =
            pristineProject && (pristineProject[Field.ClickhouseDb] ?? '') !== formData[Field.ClickhouseDb]
                ? formData[Field.ClickhouseDb]
                : undefined;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        request[Field.Description] =
            pristineProject && (pristineProject[Field.Description] ?? '') !== formData[Field.Description]
                ? formData[Field.Description]
                : undefined;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        request[Field.EventValidation] =
            pristineProject && (pristineProject[Field.EventValidation] ?? '') !== formData[Field.EventValidation]
                ? formData[Field.EventValidation]
                : undefined;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        request[Field.PreserveDBColumns] =
            pristineProject && (pristineProject[Field.PreserveDBColumns] ?? '') !== formData[Field.PreserveDBColumns]
                ? formData[Field.PreserveDBColumns]
                : undefined;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        request[Field.BackupMode] =
            pristineProject && (pristineProject[Field.BackupMode] ?? '') !== formData[Field.BackupMode]
                ? formData[Field.BackupMode]
                : undefined;
        return request;
    }

    sendRequest(patch: CreateProjectRequest | UpdateProjectRequest | null, projectId: number | null) {
        if (patch) {
            const responce =
                patch instanceof CreateProjectRequest
                    ? this.managementService.createProject(patch, true)
                    : // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
                      this.managementService.updateProject(patch, '' + projectId, true);

            responce.pipe(takeUntil(this.destroy$)).subscribe({
                next: () => {
                    this.refresh$.next(true);
                    this.isChanged$.next(false);
                    if (patch instanceof CreateProjectRequest) {
                        this.notification.success('Project has been created', '');
                    } else {
                        this.notification.success('Project has been updated', '');
                    }
                    void this.router.navigate(['projects']).then();
                },
                error: (e: HttpErrorResponse) => {
                    const title =
                        patch instanceof CreateProjectRequest ? 'Create project error' : 'Update project error';
                    this.notification.error(title, e.message);
                },
            });
        }
    }

    regenerateKey(projectId: string, key: Key): void {
        this.managementService
            .regenerateProjectKey(new Empty(), projectId, key)
            .pipe(take(1), takeUntil(this.destroy$))
            .subscribe(() => this.refresh$.next(true));
    }

    switchTab(event: NzTabChangeEvent, projectCode: string, projectName: string): void {
        this.location.replaceState(`/projects/${projectCode}/${Tab[event.index].toLowerCase()}`);

        this.brService.setBreadcrumbs([
            {
                label: 'Projects',
                link: 'projects',
            },
            { label: projectName, link: projectCode },
            { label: Tab[event.index], link: Tab[event.index].toLowerCase() },
        ]);

        this.activeTab = event.index;
    }

    schemaUploaded(): void {
        this.refresh$.next(true);
    }

    setActiveTab(): void {
        switch (this.router.url.split('/')[this.router.url.split('/').length - 1]) {
            case 'preferences':
                this.activeTab = Tab.Preferences;
                break;
            case 'events':
                this.activeTab = Tab.Events;
                break;
            case 'discover':
                this.activeTab = Tab.Discover;
                break;
            case 'upload':
                this.activeTab = Tab.Upload;
                break;
            case 'migrations':
                this.activeTab = Tab.Migrations;
                break;
            case 'peek':
                this.activeTab = Tab.Peek;
                break;
            default:
                break;
        }
    }
}
