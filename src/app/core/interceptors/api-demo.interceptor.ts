import { HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { tap } from 'rxjs';

export const apiDemoInterceptor: HttpInterceptorFn = (req, next) => {
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const tracedReq = req.clone({
    setHeaders: {
      'X-App-Client': 'solar-plants-angular',
      'X-Requested-With': 'AngularHttpClient',
    },
  });

  return next(tracedReq).pipe(
    tap({
      next: event => {
        if (event.type !== HttpEventType.Response) return;

        const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const ms = Math.round(endedAt - startedAt);

        console.info(
          `[HTTP] ${tracedReq.method} ${tracedReq.urlWithParams} -> ${event.status} (${ms}ms)`
        );
      },
      error: err => {
        const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const ms = Math.round(endedAt - startedAt);

        console.error(
          `[HTTP] ${tracedReq.method} ${tracedReq.urlWithParams} -> ERROR (${ms}ms)`,
          err
        );
      },
    })
  );
};
