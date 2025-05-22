import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'mCensor',
    pure: false,
})
export class StringCensorship implements PipeTransform {
    transform(value: string): string {
        return '•'.repeat(value.length);
    }
}
