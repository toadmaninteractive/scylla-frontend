import { Component, OnInit } from '@angular/core';
import { JsonEditorOptions } from 'ang-jsoneditor';

const DATA = {
    products: [
        {
            name: 'car',
            product: [
                {
                    name: 'honda',
                    model: [
                        { id: 'civic', name: 'civic' },
                        { id: 'accord', name: 'accord' },
                        { id: 'crv', name: 'crv' },
                        { id: 'pilot', name: 'pilot' },
                        { id: 'odyssey', name: 'odyssey' },
                    ],
                },
            ],
        },
    ],
};

@Component({
    selector: 'app-debug',
    templateUrl: './debug.component.html',
    styleUrls: ['./debug.component.scss'],
})
export class DebugComponent implements OnInit {
    editorOptions = new JsonEditorOptions();
    data: object | null = null;

    constructor() {}

    ngOnInit(): void {
        this.editorOptions.modes = ['code', 'text', 'tree'];
        this.editorOptions.mode = 'code';
        this.data = DATA;
    }

    onChangeJson(event: any) {
        console.log(event);
    }
}
