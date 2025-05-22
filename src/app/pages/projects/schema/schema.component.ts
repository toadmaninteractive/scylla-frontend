import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
    BehaviorSubject,
    combineLatest,
    debounceTime,
    distinctUntilChanged,
    filter,
    map,
    of,
    skip,
    startWith,
    Subject,
    switchMap,
    take,
    takeUntil,
    tap,
} from 'rxjs';
import { JsonEditorComponent, JsonEditorOptions } from 'ang-jsoneditor';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzUploadChangeParam } from 'ng-zorro-antd/upload';
import { HttpError } from '../../../protocol/data';
import * as Igor from '../../../protocol/igor';
import { Json } from '../../../protocol/igor';
import { ScyllaIngestionService } from '../../../protocol/ingest.service';
import { ScyllaManagementService } from '../../../protocol/management.service';
import { Descriptor, DescriptorKind, IntTypeName, Schema } from '../../../protocol/schema';
import { Project } from '../../../protocol/web';
import { Either } from '../../../shared/classes/either';

import JsonValue = Json.JsonValue;

const EVENTS_COUNT = 20;

interface CustomDescriptor extends Descriptor {
    type?: IntTypeName;
    default?: any;
}

interface Event {
    branch?: string;
    datetime?: Date;
    event_name?: string;
}

interface Field {
    name: string;
    type: string;
    kind: string;
    default: string;
}

@Component({
    selector: 'app-schema',
    templateUrl: './schema.component.html',
    styleUrls: ['./schema.component.scss'],
})
export class SchemaComponent implements OnInit, OnDestroy {
    @ViewChild('uploadEditor', { static: false }) editor: JsonEditorComponent;

    destroy$ = new Subject();
    changed$ = new BehaviorSubject<boolean>(false);
    displayedEvents$ = new BehaviorSubject<Array<[string, Field[]]>>([]);
    displayedSneakPeekEvents$ = new BehaviorSubject<Json.JsonValue | Event[]>([]);
    editorBlured$ = new BehaviorSubject<boolean>(false);
    events$ = new BehaviorSubject<Array<[string, Field[]]>>([]);
    eventsMap$ = new BehaviorSubject<Map<string, string[]>>(new Map());
    filterString$ = new BehaviorSubject<string>('');
    hasError$ = new BehaviorSubject<boolean>(false);
    loader$ = new BehaviorSubject<boolean>(false);
    projectReady$ = new Subject();
    schema$ = new BehaviorSubject<Schema | null>(null);
    showPristineEvent$ = new BehaviorSubject<boolean>(false);
    sneakPeekEvents$ = new BehaviorSubject<Json.JsonValue>([]);

    filterControl = new FormControl();
    filterSneakPeekControl = new FormControl();
    eventNumber = new FormControl(EVENTS_COUNT);
    displayedSchema: object | null = null;
    uploadedSchema = {};
    isActiveModal = false;
    project: Project | null = null;
    copyNotification = false;
    tag = '';

    discoverSchemaEditorOpt = new JsonEditorOptions();
    uploadEditorOpt = new JsonEditorOptions();
    sneakPeekEditorOpt = new JsonEditorOptions();
    data: object | null = null;

    constructor(
        private route: ActivatedRoute,
        private ingestionService: ScyllaIngestionService,
        private managementService: ScyllaManagementService,
        private notification: NzNotificationService
    ) {}

    ngOnInit(): void {
        this.loader$.next(true);

        this.initEditors();

        this.initializeSchema();

        this.initializeSneakPeekEvents();

        this.filterControl.valueChanges
            .pipe(
                takeUntil(this.destroy$),
                distinctUntilChanged(),
                debounceTime(200),
                switchMap((needle: string) => combineLatest([of(needle), this.events$.asObservable().pipe(take(1))])),
                map(([needle, events]: [string, [string, Field[]][]]) => {
                    return needle !== ''
                        ? events.filter(([name, _]) =>
                              name.toLocaleLowerCase().includes(needle.toLocaleLowerCase().trim())
                          )
                        : events;
                })
            )
            .subscribe((filteredEvents) => this.displayedEvents$.next(filteredEvents));

        this.filterSneakPeekControl.valueChanges
            .pipe(
                takeUntil(this.destroy$),
                distinctUntilChanged(),
                debounceTime(200),
                switchMap((needle: string) =>
                    combineLatest([
                        of(needle),
                        this.sneakPeekEvents$.asObservable().pipe(
                            take(1),
                            map((val) => val as Event[])
                        ),
                    ])
                ),
                map(([needle, events]: [string, Array<Event>]) =>
                    needle !== ''
                        ? events.filter((event) =>
                              Object.values(event)
                                  .join('|')
                                  .toLocaleLowerCase()
                                  .includes(needle.toLocaleLowerCase().trim())
                          )
                        : events
                )
            )
            .subscribe((filteredEvents) => this.displayedSneakPeekEvents$.next(filteredEvents));

        this.editorBlured$
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
    }

    ngOnDestroy(): void {
        this.changed$.complete();
        this.destroy$.next(null);
        this.destroy$.complete();
        this.displayedEvents$.complete();
        this.displayedSneakPeekEvents$.complete();
        this.events$.complete();
        this.eventsMap$.complete();
        this.filterString$.complete();
        this.hasError$.complete();
        this.loader$.complete();
        this.projectReady$.next(null);
        this.projectReady$.complete();
        this.schema$.complete();
        this.sneakPeekEvents$.complete();
        this.showPristineEvent$.complete();
    }

    initEditors(): void {
        this.discoverSchemaEditorOpt.modes = ['code', 'view'];
        this.discoverSchemaEditorOpt.mode = 'code';
        this.discoverSchemaEditorOpt.search = true;
        this.discoverSchemaEditorOpt.theme = 0;

        this.uploadEditorOpt.modes = ['code'];
        this.uploadEditorOpt.mode = 'code';
        this.uploadEditorOpt.mainMenuBar = false;
        this.uploadEditorOpt.onChange = () => {
            this.validateJson(this.editor)
                .pipe(this.validateSchema)
                .mapOk((okVal) => this.hasError$.next(false))
                .mapFail((err) => this.hasError$.next(true));

            this.changed$.next(true);
        };
        this.uploadEditorOpt.onBlur = () => {
            if (this.editor.isValidJson()) {
                this.editorBlured$.next(true);
            }
        };

        this.sneakPeekEditorOpt.modes = ['view', 'code'];
        this.sneakPeekEditorOpt.mode = 'code';
        this.sneakPeekEditorOpt.navigationBar = false;
        this.sneakPeekEditorOpt.search = false;
    }

    initializeSchema(): void {
        this.route.params
            .pipe(
                takeUntil(this.destroy$),
                map((params) => params['id'] as string),
                switchMap((id) => this.managementService.getProject(id)),
                tap((project) => (this.project = project)),
                filter((project) => !!project.schema),
                tap((p) => console.log(JSON.parse(p.schema))),
                tap((project) => (this.displayedSchema = JSON.parse(project.schema))),
                map((project) =>
                    Schema.fromJson(typeof project.schema === 'string' ? JSON.parse(project.schema) : project.schema)
                )
            )
            .subscribe({
                next: (schema) => {
                    this.schema$.next(schema);
                    const listEvents = this.getListEvents(schema, false);

                    this.events$.next(listEvents);
                    this.eventsMap$.next(
                        new Map(
                            this.getListEvents(schema, true).map((event) => [
                                event[0],
                                event[1].map((field) => field.name),
                            ])
                        )
                    );
                    this.displayedEvents$.next(listEvents);
                    this.loader$.next(false);
                    this.projectReady$.next(true);
                },
                error: (e) => {
                    this.notification.error('Not Valid Schema', 'failed to parse schema');
                },
            });
    }

    initializeSneakPeekEvents(): void {
        combineLatest([
            this.projectReady$.asObservable(),
            this.eventNumber.valueChanges.pipe(startWith(EVENTS_COUNT), debounceTime(250)),
        ])
            .pipe(
                takeUntil(this.destroy$),
                filter(([_, count]: [any, number]) => !!count),
                switchMap(([_, count]: [any, number]) =>
                    combineLatest([
                        this.managementService.fetchProjectEvents(this.project.code, count),
                        this.eventsMap$.asObservable(),
                        this.showPristineEvent$.asObservable(),
                    ])
                )
            )
            .subscribe(([events, eventsMap, isPristine]) => {
                const filteredEvent = events.map((event) =>
                    this.clearEvent(
                        event,
                        (event as Object).hasOwnProperty(this.tag) ? eventsMap.get(event[this.tag]) : []
                    )
                );
                this.sneakPeekEvents$.next(isPristine ? events : filteredEvent);
                this.displayedSneakPeekEvents$.next(isPristine ? events : filteredEvent);
            });
    }

    getListEvents(schema: Schema, codeOrName: boolean): Array<[string, Field[]]> {
        try {
            const docType = schema.documentType;
            this.tag = schema.customTypes[docType]['tag'] as string;
            const childrenMap: object = schema.customTypes[docType]['children'] as object;
            return Object.entries(childrenMap).map(([code, name]) => {
                const fieldsSet = new Set(this.traversalOfNodes(name as string, schema, []));
                const handledFlatFields = [...fieldsSet]
                    .map((e) => Object.entries(e))
                    .flat()
                    .sort((a, b) => (a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0));
                return [(codeOrName ? code : name) as string, this.fieldsListToTable(handledFlatFields)];
            });
        } catch (e) {
            return [];
        }
    }

    // Recursive
    traversalOfNodes(
        nodeName: string,
        schema: Schema,
        fields: Array<{ [key: string]: Descriptor }>
    ): Array<{ [key: string]: Descriptor }> {
        if (!nodeName) {
            return [];
        }
        const node = schema.customTypes[nodeName];

        if (node['parent']) {
            const newField = [...fields, node['fields']]; //, ...node['interfaces']];
            return [...this.traversalOfNodes(node['parent'] as string, schema, newField), ...fields];
        } else {
            const newField = [...fields, node['fields']]; //, ...node['interfaces']];
            return newField as Array<{ [key: string]: Descriptor }>;
        }
    }

    fieldsListToTable(fields: [string, CustomDescriptor][]): Field[] {
        return fields.map(([name, value]) => {
            return {
                name: name,
                type: value?.type ? IntTypeName.toJsonKey(value.type) : '',
                kind: DescriptorKind.toJsonKey(value.kind),
                optional: value.optional,
                default: value.default as string,
            } as Field;
        });
    }

    validateJson(editor: JsonEditorComponent): Either<SyntaxError, JSON> {
        try {
            return Either.ok(editor.get());
        } catch (e) {
            return Either.fail(SyntaxError('Json is not valid'));
        }
    }

    validateSchema(schema: object | Schema): Either<Error, object> {
        const check =
            schema instanceof Schema
                ? !!schema.customTypes && !!schema.documentType
                : schema['document_type'] !== undefined && schema['custom_types'] !== undefined;
        return check ? Either.ok(schema) : Either.fail(new Error('Validate schema error'));
    }

    sendSchema(schema: Schema, projectId: number): void {
        if (this.validateSchema(schema).isOk()) {
            this.ingestionService
                .updateSchema(schema, projectId.toString())
                .pipe(takeUntil(this.destroy$), take(1))
                .subscribe({
                    next: (_) => {
                        this.notification.success('Schema Updated', '');
                        this.isActiveModal = false;
                    },
                    error: (e: HttpError) => {
                        this.notification.error('Update Schema Error', e.message);
                    },
                });
        }
    }

    onChangeFail(): void {
        this.changed$.next(false);
        this.hasError$.next(true);
        this.notification.error('Invalid schema', '');
    }

    onChangeOk(schema: object): void {
        this.schema$.next(Schema.fromJson(schema as Igor.Json.JsonValue));
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
                            this.schema$.next(Schema.fromJson(json as JsonValue));
                            this.displayedSchema = json;
                            this.uploadedSchema = json;
                            this.changed$.next(true);
                            this.hasError$.next(false);
                            this.notification.success('Schema Loaded', '');
                        })
                        .mapFail(() => {
                            this.hasError$.next(true);
                            this.notification.error('Invalid Schema', 'failed to parse uploaded schema');
                        });
                } else {
                    this.notification.info('This schema already has been uploaded', '');
                }
            };

            reader.onerror = () => {
                this.notification.error('Upload File Error', reader.error.message);
            };
        }
    }

    tryParse(jsonString: string): Either<SyntaxError, object> {
        try {
            return Either.ok<SyntaxError, object>(JSON.parse(jsonString));
        } catch (e) {
            return Either.fail<SyntaxError, object>(new SyntaxError('Json parsing error'));
        }
    }

    copyToClipboard(): void {
        const selBox = document.createElement('textarea');
        selBox.style.position = 'fixed';
        selBox.style.left = '0';
        selBox.style.top = '0';
        selBox.style.opacity = '0';
        selBox.value = JSON.stringify(this.displayedSchema, null, 2);
        document.body.appendChild(selBox);
        selBox.focus();
        selBox.select();
        document.execCommand('copy');
        document.body.removeChild(selBox);
        this.copyNotification = true;

        setTimeout(() => (this.copyNotification = false), 2500);
    }

    clearEvent(event: JsonValue, props: string[]): JsonValue {
        const redundantProps = Object.keys(event).filter((key) => !props.includes(key));
        // eslint-disable-next-line @typescript-eslint/ban-types
        const result = JSON.parse(JSON.stringify(event)) as Object;
        redundantProps.forEach((prop) => {
            // eslint-disable-next-line no-prototype-builtins
            if (result.hasOwnProperty(prop)) {
                delete result[prop];
            }
        });
        return result as JsonValue;
    }
}
