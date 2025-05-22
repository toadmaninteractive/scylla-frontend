import { registerLocaleData } from '@angular/common';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import en from '@angular/common/locales/en';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { en_US, NZ_I18N } from 'ng-zorro-antd/i18n';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PreloaderComponent } from './components/preloader/preloader.component';
import { CoreModule } from './core/core.module';
import { RemoveApiKeyInterceptor } from './core/interceptors/remove-api-key.interceptor';
import { ProtocolModule } from './protocol/protocol.module';

registerLocaleData(en);

@NgModule({
    declarations: [AppComponent, PreloaderComponent],
    imports: [
        BrowserAnimationsModule,
        BrowserModule,
        CoreModule,
        HttpClientModule,
        InlineSVGModule,
        FormsModule,
        ProtocolModule,
        AppRoutingModule,
    ],
    providers: [
        {
            provide: HTTP_INTERCEPTORS,
            //useClass: ApiKeyInterceptor,
            useClass: RemoveApiKeyInterceptor,
            multi: true,
        },
        { provide: NZ_I18N, useValue: en_US },
    ],
    bootstrap: [AppComponent],
})
export class AppModule {}
