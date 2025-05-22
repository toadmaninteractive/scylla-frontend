import { Component, Input, OnInit } from '@angular/core';
import { JsonEditorOptions } from 'ang-jsoneditor';
import { Schema } from '../../../../protocol/schema';

@Component({
    selector: 'app-discover-schema',
    templateUrl: './discover-schema.component.html',
    styleUrls: ['./discover-schema.component.scss'],
})
export class DiscoverSchemaComponent implements OnInit {
    copyNotification = false;
    displayedSchema: object | null = null;
    discoverSchemaEditorOpt = new JsonEditorOptions();

    @Input() set schema(value: Schema | null) {
        if (value) {
            this.displayedSchema = Schema.toJson(value) as object;
        }
    }

    ngOnInit(): void {
        this.discoverSchemaEditorOpt.modes = ['code', 'view'];
        this.discoverSchemaEditorOpt.mode = 'code';
        this.discoverSchemaEditorOpt.search = true;
        this.discoverSchemaEditorOpt.theme = 0;
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
}
