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
  <div class="lp-wrap" [attr.dir]="i18n.dir()">

    <!-- ══ DECORATIVE BACKGROUND ORBS ══ -->
    <div class="lp-orb lp-orb-1"></div>
    <div class="lp-orb lp-orb-2"></div>
    <div class="lp-orb lp-orb-3"></div>

    <div class="lp-card">

      <!-- ══ BRAND PANEL ══ -->
      <div class="lp-brand">
        <div class="lp-brand-deco lp-deco-tl"></div>
        <div class="lp-brand-deco lp-deco-br"></div>

        <div class="lp-logo-wrap">
          @if (!logoErr) {
            <img src="logo.svg" class="lp-logo" alt="التويجري" (error)="logoErr = true" />
          } @else {
            <div class="lp-logo-txt">ATS</div>
          }
        </div>

        <div class="lp-brand-sep">
          <span class="lp-brand-sep-dot"></span>
          <span class="lp-brand-sep-line"></span>
          <span class="lp-brand-sep-dot"></span>
        </div>

        <p class="lp-tagline">
          {{ i18n.lang() === 'ar' ? 'نظام إدارة التذاكر' : 'Ticket Management System' }}
        </p>
      </div>

      <!-- ══ FORM PANEL ══ -->
      <div class="lp-form-panel">

        <div class="lp-form-head">
          <div>
            <h1 class="lp-title">
              {{ i18n.lang() === 'ar' ? 'مرحباً بعودتك' : 'Welcome back' }}
            </h1>
            <p class="lp-subtitle">
              {{ i18n.lang() === 'ar' ? 'سجّل دخولك للمتابعة' : 'Sign in to continue' }}
            </p>
          </div>
          <button class="lp-lang-btn" (click)="i18n.toggle()">
            {{ i18n.lang() === 'en' ? '🌐 AR' : '🌐 EN' }}
          </button>
        </div>

        <form (ngSubmit)="submit()" class="lp-form">
          <div class="field">
            <label>{{ 'auth.username' | t }}</label>
            <input class="input lp-input" name="user" [(ngModel)]="username"
                   autocomplete="username" required
                   [placeholder]="i18n.lang() === 'ar' ? 'اسم المستخدم' : 'Enter username'" />
          </div>
          <div class="field">
            <label>{{ 'auth.password' | t }}</label>
            <input class="input lp-input" type="password" name="pwd" [(ngModel)]="password"
                   autocomplete="current-password" required
                   [placeholder]="i18n.lang() === 'ar' ? '••••••••' : '••••••••'" />
          </div>

          @if (error()) {
            <div class="lp-err">
              <span class="lp-err-icon">⚠</span>
              {{ error() }}
            </div>
          }

          <button class="btn btn-primary lp-submit" [disabled]="loading()">
            @if (loading()) {
              <span class="lp-btn-spin"></span>
            }
            {{ loading() ? ('auth.signingIn' | t) : ('auth.signIn' | t) }}
          </button>
        </form>

        <div class="lp-demo">
          <div class="lp-demo-label">{{ 'auth.demoAccounts' | t }}</div>
          <div class="demo-grid">
            @for (a of accounts; track a.u) {
              <button type="button" class="lp-demo-btn" (click)="fill(a.u, a.p)">
                <span class="lp-demo-role">{{ a.role }}</span>
                <span class="lp-demo-user">{{ a.u }}</span>
              </button>
            }
          </div>
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
    { u: 'ttech',    p: 'Tech@123',    role: 'Technician' },
    { u: 'emp1',     p: 'Emp@123',     role: 'Branch-Employee' },
    { u: 'emp2',     p: 'Emp@123',     role: 'HO-Employee' },
    { u: 'emp3',     p: 'Emp@123',     role: 'Cam-Employee' },
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
