import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, filter, map, Subject, switchMap, takeUntil } from 'rxjs';
import { JsonEditorOptions } from 'ang-jsoneditor';
import { OrderDirection } from '../../../../protocol/data';
import { Json } from '../../../../protocol/igor';
import { ScyllaManagementService } from '../../../../protocol/management.service';
import { Descriptor, DescriptorKind, IntTypeName, Schema } from '../../../../protocol/schema';
import { Project, SchemaMigrationOrderBy } from '../../../../protocol/web';

import JsonValue = Json.JsonValue;

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

interface ExtendedMigration {
    id: number;
    projectId: number;
    projectCode: string;
    previousSchema: object | null;
    schema: object;
    createdAt: Date;
    eventsCount: number;
    removedEventsCount: number;
    newEvents: Array<string>;
    eventsNewFields: Map<string, SchemaField[]>;
    eventsRemovedFields: Map<string, SchemaField[]>;
    removedEvents: Array<string>;
    diffSchema: string;
    superFields: string[];
    prevSuperFields: string[];
    newSuperFields: Set<string>;
    removedSuperFields: Set<string>;
    changedSuperFields: SchemaField[];
    changedEvents: Array<[string, SchemaField[]]>;
    allEvents: Array<[string, SchemaField[]]>;
    prevFields: SchemaField[];
    newFields: SchemaField[];
    addedFields: SchemaField[];
    removedFields: SchemaField[];
    addedFieldsSet: Set<string>;
    removedFieldsSet: Set<string>;
    allFields: SchemaField[];
    changedFields: SchemaField[];
    changedPropsMap: Map<string, string[]>;
    uniquePrevFieldsMap: Map<string, SchemaField>;
    uniqueFieldsMap: Map<string, SchemaField>;
    changedFieldsSet: Set<string>;
    updatedSuperFields: string[];
}

@Component({
    selector: 'app-migrations-list',
    templateUrl: './migrations-list.component.html',
    styleUrls: ['./migrations-list.component.scss'],
})
export class MigrationsListComponent implements OnInit, OnDestroy {
    destroy$ = new Subject<void>();
    migrations$ = new BehaviorSubject<ExtendedMigration[]>([]);
    project$ = new BehaviorSubject<Project | null>(null);
    editorOpt = new JsonEditorOptions();
    expandedSet = new Set<number>();
    tag = '';

    constructor(private managementService: ScyllaManagementService) {}

    @Input() set project(value: Project | null) {
        if (value) {
            this.project$.next(value);
        }
    }

    ngOnInit(): void {
        this.project$
            .pipe(
                takeUntil(this.destroy$),
                filter((project) => !!project),
                switchMap((project) =>
                    this.managementService
                        .fetchSchemaMigrations(
                            project.code,
                            SchemaMigrationOrderBy.CreatedAt,
                            OrderDirection.Desc,
                            0,
                            1000000,
                            project.keySu
                        )
                        .pipe(
                            map((collection) =>
                                collection.items.map((item) => {
                                    const result = {} as ExtendedMigration;
                                    result.id = item.id;
                                    result.projectId = item.projectId;
                                    result.projectCode = item.projectCode;
                                    result.previousSchema = item.previousSchema
                                        ? (JSON.parse(item.previousSchema) as object)
                                        : null;
                                    result.schema = JSON.parse(item.schema) as object;
                                    result.createdAt = item.createdAt;

                                    result.eventsCount = this.getListEvents(
                                        Schema.fromJson(JSON.parse(item.schema) as JsonValue),
                                        true
                                    ).length;

                                    if (item.schema && item.previousSchema) {
                                        const schemaEvents = this.getListEvents(
                                            Schema.fromJson(JSON.parse(item.schema) as JsonValue),
                                            true
                                        );

                                        const prevSchemaEvents = this.getListEvents(
                                            Schema.fromJson(JSON.parse(item.previousSchema) as JsonValue),
                                            true
                                        );

                                        result.prevFields = prevSchemaEvents.map((event) => event[1]).flat();
                                        result.newFields = schemaEvents.map((event) => event[1]).flat();

                                        const uniqueFields = Array.from(
                                            new Set(
                                                schemaEvents
                                                    .map((event) => event[1])
                                                    .flat()
                                                    .map((f) => f.name)
                                            )
                                        ).map((fieldName) => result.newFields.find((f) => f.name === fieldName));

                                        const uniquePrevFields = Array.from(
                                            new Set(
                                                prevSchemaEvents
                                                    .map((event) => event[1])
                                                    .flat()
                                                    .map((f) => f.name)
                                            )
                                        ).map((fieldName) => result.prevFields.find((f) => f.name === fieldName));

                                        const addedFields = this.getNewFields(uniqueFields, uniquePrevFields);
                                        const removedFields = this.getNewFields(uniquePrevFields, uniqueFields);
                                        const uniquePrevFieldsMap = new Map(uniquePrevFields.map((f) => [f.name, f]));
                                        result.uniquePrevFieldsMap = uniquePrevFieldsMap;
                                        result.uniqueFieldsMap = new Map(uniqueFields.map((f) => [f.name, f]));
                                        result.addedFields = addedFields;
                                        result.removedFields = removedFields;

                                        if (result.schema) {
                                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
                                            const docType = result.schema['document_type'];
                                            result.superFields = Object.keys(
                                                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
                                                result.schema['custom_types'][docType]['fields']
                                            );
                                        }

                                        if (result.previousSchema) {
                                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
                                            const docType = result.schema['document_type'];
                                            result.prevSuperFields = Object.keys(
                                                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
                                                result.previousSchema['custom_types'][docType]['fields']
                                            );
                                        }

                                        const schemaEventsMap = new Map(schemaEvents.map((e) => [e[0], e[1]]));
                                        const prevSchemaEventsMap = new Map(prevSchemaEvents.map((e) => [e[0], e[1]]));
                                        const eventsNewFieldsMap = new Map<string, SchemaField[]>([]);
                                        const eventsRemovedFieldsMap = new Map<string, SchemaField[]>([]);
                                        schemaEventsMap.forEach((event, key) => {
                                            const prevEventsName = prevSchemaEventsMap.has(key)
                                                ? prevSchemaEventsMap.get(key)
                                                : [];
                                            const newFields = event.filter(
                                                (e) => !prevEventsName.map((p) => p.name).includes(e.name)
                                            );
                                            const removedFields = prevEventsName.filter(
                                                (p) => !event.map((e) => e.name).includes(p.name)
                                            );
                                            if (newFields.length > 0) {
                                                eventsNewFieldsMap.set(key, newFields);
                                            }

                                            if (removedFields.length > 0) {
                                                eventsRemovedFieldsMap.set(key, removedFields);
                                            }
                                        });

                                        result.eventsNewFields = eventsNewFieldsMap;
                                        result.eventsRemovedFields = eventsRemovedFieldsMap;
                                        const newEvents = schemaEvents.filter(
                                            (item) => prevSchemaEvents.map((event) => event[0]).indexOf(item[0]) < 0
                                        );

                                        const setOfNewFields = new Set(
                                            Array.from(result.eventsNewFields)
                                                .map((e) => e[1])
                                                .flat()
                                                .map((f) => f.name)
                                        );

                                        const mapOfNewFields = new Map(
                                            Array.from(result.eventsNewFields)
                                                .map((e) => e[1])
                                                .flat()
                                                .map((f) => [f.name, f])
                                        );
                                        const setOfRemovedFields = new Set(
                                            Array.from(result.eventsRemovedFields)
                                                .map((e) => e[1])
                                                .flat()
                                                .map((f) => f.name)
                                        );

                                        const mapOfRemovedFields = new Map(
                                            Array.from(result.eventsRemovedFields)
                                                .map((e) => e[1])
                                                .flat()
                                                .map((f) => [f.name, f])
                                        );

                                        result.newSuperFields = new Set(
                                            result.superFields.filter((sf) => setOfNewFields.has(sf))
                                        );
                                        result.removedSuperFields = new Set(
                                            result.prevSuperFields.filter((sf) => setOfRemovedFields.has(sf))
                                        );

                                        const addedFieldsSet = new Set(
                                            result.addedFields
                                                .map((f) => f.name)
                                                .filter((f) => !result.newSuperFields.has(f))
                                        );
                                        result.addedFieldsSet = addedFieldsSet;
                                        const removedFieldsSet = new Set(
                                            result.removedFields
                                                .map((f) => f.name)
                                                .filter((f) => !result.removedSuperFields.has(f))
                                        );
                                        result.removedFieldsSet = removedFieldsSet;
                                        const changedFields = uniqueFields.filter(
                                            (field) =>
                                                !(addedFieldsSet.has(field.name) && removedFieldsSet.has(field.name)) &&
                                                uniquePrevFieldsMap.has(field.name)
                                        );

                                        result.changedFields = changedFields.filter(
                                            (f) => !this.isChangedField(f, uniquePrevFieldsMap.get(f.name))
                                        );

                                        result.changedPropsMap = new Map(
                                            result.changedFields.map((field) => [
                                                field.name,
                                                this.getChangedProperty(field, uniquePrevFieldsMap.get(field.name)),
                                            ])
                                        );

                                        result.changedFieldsSet = new Set(result.changedFields.map((f) => f.name));

                                        result.changedEvents = schemaEvents
                                            .filter((event) => {
                                                const eventFields = event[1].map((f) => f.name);
                                                return eventFields.filter(
                                                    (field) =>
                                                        new Set(result.changedFields.map((f) => f.name)).has(field) ||
                                                        addedFieldsSet.has(field) ||
                                                        removedFieldsSet.has(field)
                                                ).length;
                                            })
                                            .concat(
                                                prevSchemaEvents.filter((event) => {
                                                    const eventFields = event[1].map((f) => f.name);
                                                    return eventFields.filter(
                                                        (field) =>
                                                            new Set(result.changedFields.map((f) => f.name)).has(
                                                                field
                                                            ) ||
                                                            addedFieldsSet.has(field) ||
                                                            removedFieldsSet.has(field)
                                                    ).length;
                                                })
                                            );

                                        const removedEvents = prevSchemaEvents.filter(
                                            (item) => schemaEvents.map((event) => event[0]).indexOf(item[0]) < 0
                                        );

                                        const newSuperFieldsMap = new Map(
                                            Array.from(mapOfNewFields).filter((entry) =>
                                                result.newSuperFields.has(entry[0])
                                            )
                                        );

                                        const removedSuperFieldsMap = new Map(
                                            Array.from(mapOfRemovedFields).filter((entry) =>
                                                result.removedSuperFields.has(entry[0])
                                            )
                                        );

                                        const changedSuperFields = [...newSuperFieldsMap, ...removedSuperFieldsMap]
                                            .map((f) => f[1])
                                            .sort((a, b) => (a.name > b.name ? 1 : -1));

                                        result.changedSuperFields = changedSuperFields;

                                        result.newEvents = newEvents.map((item) => item[0]);
                                        result.removedEvents = removedEvents.map((item) => item[0]);

                                        result.allEvents = (
                                            result.changedEvents.filter((e) => result.newEvents.indexOf(e[0]) < 0) || []
                                        )
                                            .concat(newEvents || [])
                                            .concat(removedEvents || [])
                                            .sort((a, b) => (a[0] > b[0] ? 1 : -1));

                                        const output: [string, SchemaField[]][] = [];

                                        result.allEvents.forEach((event) => {
                                            const existing = output.filter((v, i) => {
                                                return v[0] == event[0];
                                            });
                                            if (existing.length) {
                                                const existingIndex = output.indexOf(existing[0]);
                                                output[existingIndex][1] = output[existingIndex][1].concat(event[1]);
                                            } else {
                                                output.push(event);
                                            }
                                        });

                                        result.allEvents = output.map((event) => {
                                            const uniqueFields = new Set(event[1].map((f) => f.name));
                                            const res: [string, SchemaField[]] = ['', []];
                                            res[0] = event[0];
                                            res[1] = Array.from(uniqueFields).map((f) =>
                                                event[1].find((ef) => ef.name === f)
                                            );
                                            return res;
                                        });
                                    }

                                    return result;
                                })
                            )
                        )
                )
            )
            .subscribe((migrations) => {
                this.migrations$.next(migrations);
            });

        this.editorOpt.modes = ['view', 'code'];
        this.editorOpt.mode = 'code';
        this.editorOpt.navigationBar = false;
        this.editorOpt.search = false;
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.project$.complete();
    }

    onExpandChange(id: number, checked: boolean): void {
        if (checked) {
            this.expandedSet.add(id);
        } else {
            this.expandedSet.delete(id);
        }
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
            const newField = [...fields, node['fields']] as Array<{ [key: string]: Descriptor }>; //, ...node['interfaces']];
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

    getNewFields(first: SchemaField[], second: SchemaField[]): SchemaField[] {
        const secondSet = new Set(second.map((f) => f.name));
        return first.filter((f) => !secondSet.has(f.name));
    }

    isChangedField(curr: SchemaField, prev: SchemaField): boolean {
        return JSON.stringify(curr) === JSON.stringify(prev);
    }

    getChangedProperty(curr: SchemaField, prev: SchemaField): Array<string> {
        return Object.keys(curr)
            .map((currKey) =>
                !(prev as Object).hasOwnProperty(currKey) || prev[currKey] !== curr[currKey] ? currKey : null
            )
            .filter((k) => !!k);
    }
}
