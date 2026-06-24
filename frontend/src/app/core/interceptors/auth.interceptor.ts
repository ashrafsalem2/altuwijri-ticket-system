import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshed$ = new BehaviorSubject<string | null>(null);

/** Attaches the JWT and transparently refreshes it once on a 401. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isAuthCall = req.url.includes('/api/auth/login') || req.url.includes('/api/auth/refresh');
  const token = auth.accessToken;
  let request = token && !isAuthCall
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || isAuthCall || !auth.refreshToken) {
        if (err.status === 401 && !isAuthCall) { auth.logout(); router.navigate(['/login']); }
        return throwError(() => err);
      }

      if (isRefreshing) {
        return refreshed$.pipe(
          filter(t => t !== null),
          take(1),
          switchMap(t => next(req.clone({ setHeaders: { Authorization: `Bearer ${t}` } })))
        );
      }

      isRefreshing = true;
      refreshed$.next(null);
      return auth.refresh().pipe(
        switchMap(res => {
          isRefreshing = false;
          refreshed$.next(res.accessToken);
          return next(req.clone({ setHeaders: { Authorization: `Bearer ${res.accessToken}` } }));
        }),
        catchError(refreshErr => {
          isRefreshing = false;
          auth.logout();
          router.navigate(['/login']);
          return throwError(() => refreshErr);
        })
      );
    })
  );
};
