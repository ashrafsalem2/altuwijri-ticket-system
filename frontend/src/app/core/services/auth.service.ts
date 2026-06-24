import { Injectable, computed, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, AuthUser } from '../models/models';

const ACCESS_KEY = 'tf_access';
const REFRESH_KEY = 'tf_refresh';
const USER_KEY = 'tf_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/api/auth`;

  private _user = signal<AuthUser | null>(this.readUser());
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly role = computed(() => this._user()?.role ?? null);

  login(userNameOrEmail: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/login`, { userNameOrEmail, password })
      .pipe(tap(res => this.persist(res)));
  }

  refresh(): Observable<AuthResponse> {
    const body = { accessToken: this.accessToken ?? '', refreshToken: this.refreshToken ?? '' };
    return this.http.post<AuthResponse>(`${this.base}/refresh`, body)
      .pipe(tap(res => this.persist(res)));
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.base}/change-password`, { currentPassword, newPassword });
  }

  logout(): void {
    const refreshToken = this.refreshToken;
    if (refreshToken) {
      this.http.post(`${this.base}/logout`, { refreshToken }).subscribe({ error: () => {} });
    }
    this.clear();
  }

  hasRole(...roles: string[]): boolean {
    const r = this._user()?.role;
    return !!r && roles.includes(r);
  }

  /** Reflect an availability change in the cached user without a full refresh. */
  setAvailabilityLocal(value: boolean): void {
    const u = this._user();
    if (!u) return;
    const updated = { ...u, isAvailable: value };
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
    this._user.set(updated);
  }

  get accessToken(): string | null { return localStorage.getItem(ACCESS_KEY); }
  get refreshToken(): string | null { return localStorage.getItem(REFRESH_KEY); }

  private persist(res: AuthResponse): void {
    localStorage.setItem(ACCESS_KEY, res.accessToken);
    localStorage.setItem(REFRESH_KEY, res.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this._user.set(res.user);
  }

  private clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
  }

  private readUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) as AuthUser : null;
  }
}
