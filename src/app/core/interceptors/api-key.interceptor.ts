import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class ApiKeyInterceptor implements HttpInterceptor {
    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const apiKey = 'Hyo4eHbcekpemHo';
        const modifiedReq = req.clone({
            headers: req.headers.set('X-Api-Key', apiKey),
            withCredentials: true,
        });
        return next.handle(modifiedReq);
    }
}
