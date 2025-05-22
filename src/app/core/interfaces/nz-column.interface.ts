import { NzTableSortFn, NzTableSortOrder } from 'ng-zorro-antd/table';

export interface NzColumn<T> {
    name: string;
    sortOrder: NzTableSortOrder | null;
    sortFn: NzTableSortFn<T> | null;
    sortDirections: NzTableSortOrder[];
    width?: string;
}
