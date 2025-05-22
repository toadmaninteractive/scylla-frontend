import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
    BehaviorSubject,
    combineLatest,
    debounceTime,
    distinctUntilChanged,
    filter,
    map,
    of,
    startWith,
    Subject,
    switchMap,
    take,
    takeUntil,
} from 'rxjs';
import { JsonEditorOptions } from 'ang-jsoneditor';
import { Json } from '../../../../protocol/igor';
import { ScyllaManagementService } from '../../../../protocol/management.service';
import { Descriptor, DescriptorKind, IntTypeName, Schema } from '../../../../protocol/schema';
import { Project } from '../../../../protocol/web';

import JsonValue = Json.JsonValue;

const EVENTS_COUNT = 20;

interface SchemaField {
    name: string;
    type: string;
    kind: string;
    default: string;
}

interface CustomDescriptor extends Descriptor {
    type?: IntTypeName;
    default?: any;
}

@Component({
    selector: 'app-sneak-peak',
    templateUrl: './sneak-peak.component.html',
    styleUrls: ['./sneak-peak.component.scss'],
})
export class SneakPeakComponent implements OnInit, OnDestroy {
    destroy$ = new Subject<void>();
    displayedSneakPeekEvents$ = new BehaviorSubject<Json.JsonValue | Event[]>([]);
    eventsMap$ = new BehaviorSubject<Map<string, string[]>>(new Map());
    ready$ = new BehaviorSubject<boolean>(false);
    project$ = new BehaviorSubject<Project | null>(null);
    showPristineEvent$ = new BehaviorSubject<boolean>(false);
    sneakPeekEvents$ = new BehaviorSubject<Json.JsonValue>([]);
    eventNumber = new FormControl(EVENTS_COUNT);
    filterSneakPeekControl = new FormControl();
    sneakPeekEditorOpt = new JsonEditorOptions();
    tag = '';

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private managementService: ScyllaManagementService
    ) {}

    @Input() set schema(value: Schema | null) {
        if (value) {
            this.eventsMap$.next(
                new Map(this.getListEvents(value, true).map((event) => [event[0], event[1].map((field) => field.name)]))
            );
            this.ready$.next(true);
        }
    }

    @Input() set project(value: Project | null) {
        if (value) {
            this.project$.next(value);
        }
    }

    ngOnInit(): void {
        combineLatest([
            this.ready$.asObservable(),
            this.eventNumber.valueChanges.pipe(startWith(EVENTS_COUNT), debounceTime(250)),
            this.project$.asObservable(),
        ])
            .pipe(
                takeUntil(this.destroy$),
                filter(([ready, count, project]: [boolean, number, Project | null]) => !!ready && !!project),
                switchMap(([_, count, project]: [boolean, number, Project]) =>
                    combineLatest([
                        this.managementService.fetchProjectEvents(project.code, count),
                        this.eventsMap$.asObservable(),
                        this.showPristineEvent$.asObservable(),
                    ])
                )
            )
            .subscribe(([events, eventsMap, isPristine]) => {
                const filteredEvent = events
                    .map((event) =>
                        this.clearEvent(
                            event,
                            // eslint-disable-next-line no-prototype-builtins
                            (event as Object).hasOwnProperty(this.tag) && eventsMap.has(event[this.tag])
                                ? eventsMap.get(event[this.tag])
                                : []
                        )
                    )
                    .filter((event) => Object.keys(event).length)
                    .reverse();
                this.sneakPeekEvents$.next(isPristine ? events : filteredEvent);
                this.displayedSneakPeekEvents$.next(isPristine ? events : filteredEvent);
            });

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
                            map((val) => val as unknown as Event[])
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

        this.sneakPeekEditorOpt.modes = ['view', 'code'];
        this.sneakPeekEditorOpt.mode = 'code';
        this.sneakPeekEditorOpt.navigationBar = false;
        this.sneakPeekEditorOpt.search = false;
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    getListEvents(schema: Schema, codeOrName: boolean): Array<[string, SchemaField[]]> {
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

    fieldsListToTable(fields: [string, CustomDescriptor][]): SchemaField[] {
        return fields.map(([name, value]) => {
            return {
                name: name,
                type: value?.type ? IntTypeName.toJsonKey(value.type) : '',
                kind: DescriptorKind.toJsonKey(value.kind),
                optional: value.optional,
                default: value.default as string,
            } as SchemaField;
        });
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
