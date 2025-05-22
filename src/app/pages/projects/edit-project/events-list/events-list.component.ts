import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import {
    BehaviorSubject,
    combineLatest,
    debounceTime,
    distinctUntilChanged,
    map,
    of,
    Subject,
    switchMap,
    take,
    takeUntil,
} from 'rxjs';
import { Descriptor, DescriptorKind, IntTypeName, Schema } from '../../../../protocol/schema';

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
    selector: 'app-events-list',
    templateUrl: './events-list.component.html',
    styleUrls: ['./events-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsListComponent implements OnInit, OnDestroy {
    destroy$ = new Subject<void>();
    displayedEvents$ = new BehaviorSubject<Array<[string, SchemaField[]]>>([]);
    events$ = new BehaviorSubject<Array<[string, SchemaField[]]>>([]);
    filterControl = new FormControl();
    variantKeys: Array<string> = [];
    variantKeysSet: Set<string> = new Set();

    @Input() set schema(value: Schema | null) {
        if (value) {
            const listEvents = this.getListEvents(value, true);
            this.variantKeys = this.getRootVariantFields(value);
            this.variantKeysSet = new Set(this.variantKeys);
            this.events$.next(listEvents);
            this.displayedEvents$.next(listEvents);
        }
    }

    ngOnInit(): void {
        this.filterControl.valueChanges
            .pipe(
                takeUntil(this.destroy$),
                distinctUntilChanged(),
                debounceTime(200),
                switchMap((needle: string) => combineLatest([of(needle), this.events$.asObservable().pipe(take(1))])),
                map(([needle, events]: [string, [string, SchemaField[]][]]) => {
                    return needle !== ''
                        ? events.filter(([name, _]) =>
                              name.toLocaleLowerCase().includes(needle.toLocaleLowerCase().trim())
                          )
                        : events;
                })
            )
            .subscribe((filteredEvents) => {
                this.displayedEvents$.next(filteredEvents);
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.events$.complete();
    }

    getListEvents(schema: Schema, codeOrName: boolean): Array<[string, SchemaField[]]> {
        try {
            const docType = schema.documentType;
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
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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

    getRootVariantFields(schema: Schema): Array<string> {
        return schema?.customTypes[schema.documentType]
            ? Object.keys(schema.customTypes[schema.documentType]['fields'])
            : [];
    }

    getEventVariantField(fieldList: readonly SchemaField[]): SchemaField[] {
        const fieldsMap = new Map(fieldList.map((field) => [field.name, field]));
        return this.variantKeys
            .map((vk) => (fieldsMap.has(vk) ? fieldsMap.get(vk) : null))
            .filter((value) => !!value)
            .flat();
    }
}
