export interface MenuItem {
    title: string;
    icon?: string;
    link: string;
    collapsed?: boolean;
    parent?: boolean;
    children?: MenuItem[];
}

export const Menu: Array<MenuItem> = [
    {
        title: 'ClickHouse',
        icon: 'clickhouse',
        link: 'clickhouse',
        collapsed: false,
        parent: false,
    },
    {
        title: 'Projects',
        icon: 'project',
        link: 'projects',
        collapsed: false,
        parent: false,
    },
];
