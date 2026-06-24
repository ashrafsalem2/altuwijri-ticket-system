import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { I18nService } from '../core/services/i18n.service';
import { NotificationService, ChatService, UserService } from '../core/services/data.services';
import { TranslatePipe } from '../core/pipes/translate.pipe';
import { Notification } from '../core/models/models';
import { initials, timeAgo } from '../shared/util';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  styleUrl: './shell.scss',
  template: `
  <div class="layout" [class.sidebar-open]="sidebarOpen()" [attr.dir]="i18n.dir()">
    <div class="backdrop" (click)="sidebarOpen.set(false)"></div>

    <aside class="sidebar">
      <div class="brand">
        <div class="logo-wrap">
          <img src="logo.svg" class="logo-img" alt="ATS" (error)="logoErr = true" [class.hidden]="logoErr" />
          @if (logoErr) { <span class="logo-txt">{{ 'app.short' | t }}</span> }
        </div>
        @if (logoErr) {
          <div class="brand-text">
            <span class="brand-name">{{ 'app.name' | t }}</span>
            <span class="brand-dept">{{ 'app.dept' | t }}</span>
          </div>
        }
        <button class="btn btn-icon btn-ghost close-side" (click)="sidebarOpen.set(false)">✕</button>
      </div>

      <nav>
        <a routerLink="/dashboard" routerLinkActive="active">
          <span class="ic">▦</span> {{ 'nav.dashboard' | t }}
        </a>
        @if (auth.hasRole('Admin', 'Manager')) {
          <a routerLink="/board" routerLinkActive="active">
            <span class="ic">▤</span> {{ 'nav.board' | t }}
          </a>
        }
        @if (!auth.hasRole('Employee')) {
          <a routerLink="/tasks" routerLinkActive="active">
            <span class="ic">☰</span> {{ 'nav.tasks' | t }}
          </a>
          <a routerLink="/projects" routerLinkActive="active">
            <span class="ic">◫</span> {{ 'nav.projects' | t }}
          </a>
        }
        @if (auth.hasRole('Employee')) {
          <a routerLink="/my-tickets" routerLinkActive="active">
            <span class="ic">🎫</span> {{ 'nav.myTickets' | t }}
          </a>
        }
        <a routerLink="/chat" routerLinkActive="active">
          <span class="ic">💬</span> {{ 'nav.chat' | t }}
          @if (chatUnread() > 0) { <span class="side-badge">{{ chatUnread() }}</span> }
        </a>
        @if (auth.hasRole('Employee')) {
          <a routerLink="/my-reports" routerLinkActive="active">
            <span class="ic">📊</span> {{ 'nav.myReports' | t }}
          </a>
        }
        @if (auth.hasRole('Admin', 'Manager')) {
          <a routerLink="/reports" routerLinkActive="active">
            <span class="ic">📊</span> {{ 'nav.reports' | t }}
          </a>
        }
        @if (auth.hasRole('Admin','Manager')) {
          <a routerLink="/organization" routerLinkActive="active">
            <span class="ic">🏢</span> {{ 'nav.org' | t }}
          </a>
          <a routerLink="/users" routerLinkActive="active">
            <span class="ic">◑</span> {{ 'nav.users' | t }}
          </a>
        }
      </nav>

      <div class="side-foot text-xs">{{ 'app.dept' | t }} · v2.1</div>
    </aside>

    <div class="main">
      <header class="topbar">
        <button class="btn btn-icon btn-ghost hamburger" (click)="sidebarOpen.set(true)" aria-label="Menu">☰</button>
        <div class="spacer"></div>

        <!-- Language toggle -->
        <button class="lang-btn" (click)="i18n.toggle()" [title]="i18n.lang() === 'en' ? 'Switch to Arabic' : 'Switch to English'">
          @if (i18n.lang() === 'en') { 🌐 AR } @else { 🌐 EN }
        </button>

        @if (auth.hasRole('Admin','Manager','Technician')) {
          <button class="avail-toggle" [class.on]="available()" (click)="toggleAvailability()"
            [title]="(available() ? 'avail.on' : 'avail.off') | t">
            <span class="avail-dot"></span>
            {{ (available() ? 'avail.on' : 'avail.off') | t }}
          </button>
        }

        <div class="notif">
          <button class="btn btn-icon btn-ghost" (click)="toggleNotif()" title="Notifications">
            🔔 @if (unread() > 0) { <span class="nbadge">{{ unread() }}</span> }
          </button>
          @if (notifOpen()) {
            <div class="dropdown notif-list" (click)="$event.stopPropagation()">
              <div class="flex justify-between items-center dd-head">
                <strong>Notifications</strong>
                <button class="btn btn-sm btn-ghost" (click)="markAll()">Mark all read</button>
              </div>
              @for (n of notifications(); track n.id) {
                <div class="notif-item" [class.un]="!n.isRead" (click)="open(n)">
                  <div class="ni-title" dir="auto">{{ n.title }}</div>
                  <div class="text-xs muted" dir="auto">{{ n.message }}</div>
                  <div class="text-xs muted">{{ ago(n.createdAt) }}</div>
                </div>
              } @empty { <div class="empty text-sm">No notifications</div> }
            </div>
          }
        </div>

        <div class="user-menu">
          <button class="user-btn" (click)="toggleUser()">
            <span class="avatar" [style.background]="auth.user()?.avatarColor || '#2563eb'">{{ ini(auth.user()?.fullName) }}</span>
            <span class="u-meta">
              <span class="u-name">{{ auth.user()?.fullName }}</span>
              <span class="text-xs muted">{{ auth.user()?.role }}</span>
            </span>
          </button>
          @if (userOpen()) {
            <div class="dropdown user-dd" (click)="$event.stopPropagation()">
              <div class="dd-head">
                <strong>{{ auth.user()?.fullName }}</strong>
                <div class="text-xs muted">{{ auth.user()?.email }}</div>
                @if (auth.user()?.branchName) { <div class="text-xs muted">Branch: {{ auth.user()?.branchName }}</div> }
              </div>
              <button class="dd-item" (click)="logout()">{{ 'auth.signOut' | t }}</button>
            </div>
          }
        </div>
      </header>

      <main class="content"><router-outlet /></main>
    </div>
  </div>
  `
})
export class Shell implements OnInit, OnDestroy {
  auth = inject(AuthService);
  i18n = inject(I18nService);
  private notifSvc = inject(NotificationService);
  private chatSvc = inject(ChatService);
  private userSvc = inject(UserService);
  private router = inject(Router);

  unread = signal(0);
  chatUnread = signal(0);
  notifications = signal<Notification[]>([]);
  notifOpen = signal(false);
  userOpen = signal(false);
  sidebarOpen = signal(false);
  available = signal(false);
  logoErr = false;
  private timer?: any;
  private docHandler = () => { this.notifOpen.set(false); this.userOpen.set(false); };

  ngOnInit() {
    this.available.set(this.auth.user()?.isAvailable ?? false);
    this.refreshCounts();
    this.timer = setInterval(() => this.refreshCounts(), 20000);
    document.addEventListener('click', this.docHandler);
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.sidebarOpen.set(false);
      this.notifOpen.set(false);
      this.userOpen.set(false);
    });
  }
  ngOnDestroy() { clearInterval(this.timer); document.removeEventListener('click', this.docHandler); }

  ini = initials;
  ago = timeAgo;

  refreshCounts() {
    this.notifSvc.unreadCount().subscribe(c => this.unread.set(c));
    this.chatSvc.unreadCount().subscribe(c => this.chatUnread.set(c));
  }

  toggleAvailability() {
    const next = !this.available();
    this.available.set(next);
    this.userSvc.setMyAvailability(next).subscribe({
      next: () => this.auth.setAvailabilityLocal(next),
      error: () => this.available.set(!next)
    });
  }

  toggleNotif() {
    const open = !this.notifOpen(); setTimeout(() => this.notifOpen.set(open));
    this.userOpen.set(false);
    if (open) this.notifSvc.getMine().subscribe(n => this.notifications.set(n));
  }
  toggleUser() { const o = !this.userOpen(); setTimeout(() => this.userOpen.set(o)); this.notifOpen.set(false); }
  markAll() { this.notifSvc.markAllRead().subscribe(() => { this.unread.set(0); this.notifications.update(ns => ns.map(n => ({ ...n, isRead: true }))); }); }
  open(n: Notification) {
    if (!n.isRead) this.notifSvc.markRead(n.id).subscribe(() => this.refreshCounts());
    if (n.taskId) {
      this.router.navigate(['/tasks', n.taskId]);
    } else {
      this.notifOpen.set(false);
    }
  }
  logout() { this.auth.logout(); this.router.navigate(['/login']); }
}
