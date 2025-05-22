import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, filter, skip, Subject, take, takeUntil } from 'rxjs';
import { JsonEditorComponent, JsonEditorOptions } from 'ang-jsoneditor';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzUploadChangeParam } from 'ng-zorro-antd/upload';
import { ConflictError, HttpError } from '../../../../protocol/data';
import * as Igor from '../../../../protocol/igor';
import { Json } from '../../../../protocol/igor';
import { ScyllaIngestionService } from '../../../../protocol/ingest.service';
import { ScyllaManagementService } from '../../../../protocol/management.service';
import { Schema } from '../../../../protocol/schema';
import { Project } from '../../../../protocol/web';
import { Either } from '../../../../shared/classes/either';

import JsonValue = Json.JsonValue;

@Component({
    selector: 'app-upload-schema',
    templateUrl: './upload-schema.component.html',
    styleUrls: ['./upload-schema.component.scss'],
})
export class UploadSchemaComponent implements OnInit, OnDestroy {
    @ViewChild('uploadEditor', { static: false }) editor: JsonEditorComponent;
    @Output() schemaUploaded = new EventEmitter<boolean>();
    destroy$ = new Subject<void>();
    changed$ = new BehaviorSubject<boolean>(false);
    editorBlurred$ = new BehaviorSubject<boolean>(false);
    hasError$ = new BehaviorSubject<boolean>(false);
    localSchema$ = new BehaviorSubject<Schema | null>(null);
    project$ = new BehaviorSubject<Project | null>(null);
    isActiveModal = false;
    displayedSchema: object | null = null;
    uploadedSchema = {};
    uploadEditorOpt = new JsonEditorOptions();

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private ingestionService: ScyllaIngestionService,
        private managementService: ScyllaManagementService,
        private modalService: NzModalService,
        private notificationService: NzNotificationService
    ) {}

    @Input() set schema(value: Schema | null) {
        if (value) {
            this.displayedSchema = value as object;
            this.localSchema$.next(value);
        }
    }

    @Input() set project(value: Project | null) {
        if (value) {
            this.project$.next(value);
        }
    }

    ngOnInit(): void {
        this.editorBlurred$
            .asObservable()
            .pipe(
                filter((flag) => !!flag),
                skip(1)
            )
            .subscribe(() => {
                this.validateJson(this.editor)
                    .pipe(this.validateSchema)
                    .mapOk((schema: Schema) => this.onChangeOk(schema))
                    .mapFail((_) => this.onChangeFail());
            });

        this.uploadEditorOpt.modes = ['code'];
        this.uploadEditorOpt.mode = 'code';
        this.uploadEditorOpt.mainMenuBar = false;
        this.uploadEditorOpt.onChange = () => {
            this.validateJson(this.editor)
                .pipe(this.validateSchema)
                .mapOk(() => this.hasError$.next(false))
                .mapFail(() => this.hasError$.next(true));

            this.changed$.next(true);
        };
        this.uploadEditorOpt.onBlur = () => {
            if (this.editor.isValidJson()) {
                this.editorBlurred$.next(true);
            }
        };
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.changed$.complete();
        this.editorBlurred$.complete();
        this.hasError$.complete();
        this.localSchema$.complete();
        this.project$.complete();
    }

    onChangeFail(): void {
        this.changed$.next(false);
        this.hasError$.next(true);
        this.notificationService.error('Invalid schema', '');
    }

    onChangeOk(schema: object): void {
        this.localSchema$.next(Schema.fromJson(schema as Igor.Json.JsonValue));
        this.displayedSchema = schema;
        this.uploadedSchema = schema;
        this.changed$.next(true);
        this.hasError$.next(false);
    }

    uploadJsonFile(event: NzUploadChangeParam): void {
        if (event.type === 'start') {
            const reader = new FileReader();
            reader.readAsText(event.file.originFileObj);
            reader.onload = () => {
                const result = reader.result as string;
                if (result !== JSON.stringify(this.displayedSchema)) {
                    this.tryParse(result)
                        .pipe(this.validateSchema)
                        .mapOk((json: object) => {
                            this.localSchema$.next(Schema.fromJson(json as JsonValue));
                            this.displayedSchema = json;
                            this.uploadedSchema = json;
                            this.changed$.next(true);
                            this.hasError$.next(false);
                            this.notificationService.success('Schema Loaded', '');
                        })
                        .mapFail(() => {
                            this.hasError$.next(true);
                            this.notificationService.error('Invalid Schema', 'failed to parse uploaded schema');
                        });
                } else {
                    this.notificationService.info('This schema already has been uploaded', '');
                }
            };

            reader.onerror = () => {
                this.notificationService.error('Upload File Error', reader.error.message);
            };
        }
    }

    tryParse(jsonString: string): Either<SyntaxError, object> {
        try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            return Either.ok<SyntaxError, object>(JSON.parse(jsonString));
        } catch (e) {
            return Either.fail<SyntaxError, object>(new SyntaxError('Json parsing error'));
        }
    }

    validateSchema(schema: object | Schema): Either<Error, object> {
        const check =
            schema instanceof Schema
                ? !!schema.customTypes && !!schema.documentType
                : schema['document_type'] !== undefined && schema['custom_types'] !== undefined;
        return check ? Either.ok(schema) : Either.fail(new Error('Validate schema error'));
    }

    validateJson(editor: JsonEditorComponent): Either<SyntaxError, JSON> {
        try {
            return Either.ok(editor.get());
        } catch (e) {
            return Either.fail(SyntaxError('Json is not valid'));
        }
    }

    sendSchema(schema: Schema, projectId: number, forse = false): void {
        if (this.validateSchema(schema).isOk()) {
            this.ingestionService
                .updateSchema(schema, projectId.toString(), forse)
                .pipe(takeUntil(this.destroy$), take(1))
                .subscribe({
                    next: (_) => {
                        this.notificationService.success('Schema Updated', '');
                        this.isActiveModal = false;
                        this.schemaUploaded.next(true);
                    },
                    error: (e: HttpError) => {
                        if (e instanceof ConflictError) {
                            this.isActiveModal = false;
                            this.modalService.confirm({
                                nzTitle: 'Schema Conflict Error',
                                nzContent:
                                    'Further uploading of the scheme will lead to irreversible changes, continue?',
                                nzOnOk: () => this.sendSchema(schema, projectId, true),
                            });
                        } else {
                            this.notificationService.error('Update Schema Error', e.message);
                        }
                    },
                });
        }
    }
}
