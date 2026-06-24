import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

@Component({
  selector: 'app-login',
  imports: [FormsModule, TranslatePipe],
  styleUrl: './login.scss',
  template: `
  <div class="login-wrap" [attr.dir]="i18n.dir()">
    <div class="login-card card">
      <div class="brand">
        <div class="logo-wrap">
          @if (!logoErr) { <img src="assets/logo.png" class="logo-img" alt="ATS" (error)="logoErr = true" /> }
          @if (logoErr) { <div class="logo">ATS</div> }
        </div>
        <div>
          <h1>{{ 'app.name' | t }}</h1>
          <p class="muted text-sm">{{ 'app.dept' | t }}</p>
        </div>
        <button class="lang-btn-login" (click)="i18n.toggle()">
          {{ i18n.lang() === 'en' ? '🌐 AR' : '🌐 EN' }}
        </button>
      </div>

      <form (ngSubmit)="submit()">
        <div class="field">
          <label>{{ 'auth.username' | t }}</label>
          <input class="input" name="user" [(ngModel)]="username" autocomplete="username" required />
        </div>
        <div class="field">
          <label>{{ 'auth.password' | t }}</label>
          <input class="input" type="password" name="pwd" [(ngModel)]="password" autocomplete="current-password" required />
        </div>
        @if (error()) { <div class="err">{{ error() }}</div> }
        <button class="btn btn-primary" style="width:100%" [disabled]="loading()">
          {{ loading() ? ('auth.signingIn' | t) : ('auth.signIn' | t) }}
        </button>
      </form>

      <div class="demo">
        <p class="text-xs muted">{{ 'auth.demoAccounts' | t }}</p>
        <div class="demo-grid">
          @for (a of accounts; track a.u) {
            <button type="button" class="btn btn-sm btn-ghost demo-btn" (click)="fill(a.u, a.p)">
              <span class="demo-role">{{ a.role }}</span>
              <span class="demo-user">{{ a.u }}</span>
            </button>
          }
        </div>
      </div>
    </div>
  </div>
  `
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);
  i18n = inject(I18nService);

  username = '';
  password = '';
  loading = signal(false);
  error = signal('');
  logoErr = false;

  accounts = [
    { u: 'admin',    p: 'Admin@123',   role: 'Admin' },
    { u: 'mmanager', p: 'Manager@123', role: 'Manager' },
    { u: 'ttech',    p: 'Tech@123',    role: 'Technician' },
    { u: 'viewer',   p: 'Viewer@123',  role: 'Viewer' },
    { u: 'emp1',     p: 'Emp@123',     role: 'Employee' },
  ];

  fill(u: string, p: string) { this.username = u; this.password = p; }

  submit() {
    if (!this.username || !this.password) return;
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.username, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e) => {
        const msg = e?.error?.title ?? e?.message ?? `HTTP ${e?.status ?? 0}: ${e?.statusText ?? 'Network error'}`;
        this.error.set(msg);
        this.loading.set(false);
      }
    });
  }
}
