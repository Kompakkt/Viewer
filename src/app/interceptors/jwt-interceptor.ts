import { HttpEvent, HttpEventType, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export const jwtInterceptor = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const auth = req.headers.get('Authorization');
  if (!auth) {
    const token = localStorage.getItem('jwt');
    if (token) {
      req = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`),
      });
    }
  }
  return next(req).pipe(
    tap(event => {
      if (event.type === HttpEventType.Response) {
        const jwtKey = event.headers.keys().find(key => key.toLowerCase() === 'x-jwt');
        const jwt = event.headers.get(jwtKey ?? 'x-jwt');
        if (!jwt) return;
        localStorage.setItem('jwt', jwt);
      }
    }),
  );
};
