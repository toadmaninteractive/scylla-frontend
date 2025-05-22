import { Component, OnDestroy, OnInit } from '@angular/core';
import {
    AbstractControl,
    FormBuilder,
    FormControl,
    FormGroup,
    ValidationErrors,
    ValidatorFn,
    Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, combineLatest, filter, map, of, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { BreadcrumbsService } from '../../../core/services/breadcrumbs.service';
import { ScyllaManagementService } from '../../../protocol/management.service';
import {
    ClickhouseInstance,
    CreateClickhouseInstanceRequest,
    UpdateClickhouseInstanceRequest,
} from '../../../protocol/web';

enum Field {
    Name = 'name',
    Code = 'code',
    Uri = 'uri',
    Username = 'username',
    Password = 'password',
    CHurl = 'ClickHouseURL',
}

@Component({
    selector: 'app-edit-connection',
    templateUrl: './edit-connection.component.html',
    styleUrls: ['./edit-connection.component.scss'],
})
export class EditConnectionComponent implements OnInit, OnDestroy {
    destroy$ = new Subject();
    clickhouseCode$ = new BehaviorSubject<string | null>(null);
    isChanged$ = new BehaviorSubject<boolean>(false);
    refresh$ = new BehaviorSubject<boolean>(false);
    patch$ = new BehaviorSubject<UpdateClickhouseInstanceRequest | CreateClickhouseInstanceRequest | null>(null);

    passwordVisible = false;
    pristineCh: ClickhouseInstance | null = null;
    form = this.initForm(null);
    field = Field;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private fb: FormBuilder,
        private brService: BreadcrumbsService,
        private managementService: ScyllaManagementService,
        private notificationService: NzNotificationService
    ) {}

    ngOnInit(): void {
        if (this.router.url.split('/')[this.router.url.split('/').length - 1] === 'edit') {
            this.patch$.next(new UpdateClickhouseInstanceRequest());
            this.route.paramMap
                .pipe(
                    takeUntil(this.destroy$),
                    filter((paramMap) => paramMap.has('code')),
                    map((paramMap) => paramMap.get('code'))
                )
                .subscribe((code) => this.clickhouseCode$.next(code));
        } else {
            this.patch$.next(new CreateClickhouseInstanceRequest());
        }

        combineLatest([this.clickhouseCode$.asObservable(), this.refresh$.asObservable()])
            .pipe(
                takeUntil(this.destroy$),
                switchMap(([code, refresh]) => (code ? this.managementService.getClickhouseInstance(code) : of(null))),
                tap((ch) => {
                    if (ch) {
                        this.brService.setBreadcrumbs([
                            {
                                label: 'Clickhouse',
                                link: 'clickhouse',
                            },
                            {
                                label: ch.name,
                                link: ch.code,
                            },
                            { label: 'Edit', link: 'edit' },
                        ]);
                    } else {
                        this.brService.setBreadcrumbs([
                            {
                                label: 'Clickhouse',
                                link: 'clickhouse',
                            },
                            { label: 'Create', link: 'create' },
                        ]);
                    }
                }),
                tap((ch) => (this.pristineCh = ch ? ch : this.createEmptyInstance(new ClickhouseInstance()))),
                map((instance) => this.initForm(instance)),
                tap((form) => (this.form = form)),
                switchMap((form) => combineLatest([form.valueChanges, this.clickhouseCode$.asObservable()])),
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                map(([formData, code]) => this.makePatch(this.pristineCh, formData, code)),
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
        this.clickhouseCode$.complete();
        this.isChanged$.complete();
        this.refresh$.complete();
        this.patch$.complete();
    }

    clickhouseUrlValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const pattern = new RegExp('https?://[a-z0-9_-]+[a-z0-9_.]*:?([0-9]*)?/?');
            if (control.value.toString() && !pattern.test(control.value.toString())) {
                return { confirm: false, warning: true };
            }
            return {};
        };
    }

    initForm(clickhouse: ClickhouseInstance | null): FormGroup {
        const chUrl: string | null =
            clickhouse?.[Field.Name] && clickhouse?.[Field.Uri]
                ? `jdbc:clickhouse://${clickhouse?.[Field.Uri]}/${clickhouse?.[Field.Name]}`
                : null;

        return this.fb.group({
            [Field.Name]: new FormControl(clickhouse?.[Field.Name] ?? '', Validators.required),
            [Field.Code]: new FormControl(clickhouse?.[Field.Code] ?? '', Validators.required),
            [Field.Uri]: new FormControl(clickhouse?.[Field.Uri] ?? '', [
                Validators.required,
                this.clickhouseUrlValidator(),
            ]),
            [Field.Username]: new FormControl(clickhouse?.[Field.Username] ?? '', Validators.required),
            [Field.Password]: new FormControl(clickhouse?.[Field.Password] ?? '', Validators.required),
            [Field.CHurl]: new FormControl(chUrl),
        });
    }

    createEmptyInstance(ch: ClickhouseInstance): ClickhouseInstance {
        ch.name = '';
        ch.code = '';
        ch.uri = '';
        ch.password = '';
        ch.username = '';
        return ch;
    }

    // FIXME
    makePatch(
        pristineCh: ClickhouseInstance | null,
        formData: { Field: any },
        clickhouseId: string | null
    ): CreateClickhouseInstanceRequest | UpdateClickhouseInstanceRequest {
        const patch = Object.entries(formData).reduce(
            (request, [key, value]) => {
                if (key === 'createdAt' || key === 'updatedAt') {
                    // @ts-ignore
                    request[key as Field] =
                        pristineCh && pristineCh[key].getTime() !== value.getTime() ? value : undefined;
                } else {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    // @ts-ignore
                    request[key as Field] = pristineCh && pristineCh[key as Field] !== value ? value : undefined;
                }

                return request;
            },
            clickhouseId ? new UpdateClickhouseInstanceRequest() : new CreateClickhouseInstanceRequest()
        );
        return patch;
    }

    sendRequest(
        patch: CreateClickhouseInstanceRequest | UpdateClickhouseInstanceRequest | null,
        clickhouseCode: string | null
    ) {
        if (patch) {
            const responce =
                patch instanceof CreateClickhouseInstanceRequest
                    ? this.managementService.createClickhouseInstance(patch)
                    : this.managementService.updateClickhouseInstance(patch, clickhouseCode.toString());

            responce.pipe(takeUntil(this.destroy$)).subscribe({
                next: () => {
                    this.refresh$.next(true);
                    this.isChanged$.next(false);
                    this.notificationService.success(
                        `Clickhouse instance has been ${
                            patch instanceof CreateClickhouseInstanceRequest ? 'created' : 'updated'
                        }`,
                        ''
                    );
                    void this.router.navigate(['/clickhouse']);
                },
                error: (error) => this.notificationService.error('Error', error?.message || 'Unknown error'),
            });
        }
    }
}
