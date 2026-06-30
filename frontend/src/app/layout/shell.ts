import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { I18nService } from '../core/services/i18n.service';
import { ThemeService } from '../core/services/theme.service';
import { NotificationService, ChatService, UserService, AppLinksService, GuidelinesService, OrganizationService } from '../core/services/data.services';
import { TranslatePipe } from '../core/pipes/translate.pipe';
import { Notification, AppLink, Guideline, BranchPublic } from '../core/models/models';
import { initials, timeAgo } from '../shared/util';
import { ToastService } from '../core/services/toast.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe, FormsModule],
  styleUrl: './shell.scss',
  template: `
  <div class="layout" [class.sidebar-open]="sidebarOpen()" [class.sidebar-collapsed]="sidebarCollapsed()" [attr.dir]="i18n.dir()">
    <div class="backdrop" (click)="sidebarOpen.set(false)"></div>

    <!-- ═══ SIDEBAR ═══ -->
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
        <a routerLink="/dashboard" routerLinkActive="active" [title]="'nav.dashboard' | t"><span class="ic">▦</span> <span class="nav-lbl">{{ 'nav.dashboard' | t }}</span></a>
        <a routerLink="/calendar"  routerLinkActive="active" [title]="'nav.calendar'  | t"><span class="ic">📅</span> <span class="nav-lbl">{{ 'nav.calendar'  | t }}</span></a>
        @if (auth.hasRole('Admin')) {
          <a routerLink="/board" routerLinkActive="active" [title]="'nav.board' | t"><span class="ic">▤</span> <span class="nav-lbl">{{ 'nav.board' | t }}</span></a>
        }
        @if (!auth.hasRole('Branch-Employee', 'HO-Employee', 'Cam-Employee')) {
          <a routerLink="/tasks"    routerLinkActive="active" [title]="'nav.tasks'    | t"><span class="ic">☰</span> <span class="nav-lbl">{{ 'nav.tasks'    | t }}</span></a>
          <a routerLink="/projects" routerLinkActive="active" [title]="'nav.projects' | t"><span class="ic">◫</span> <span class="nav-lbl">{{ 'nav.projects' | t }}</span></a>
        }
        @if (auth.hasRole('Branch-Employee', 'HO-Employee', 'Cam-Employee')) {
          <a routerLink="/my-tickets" routerLinkActive="active" [title]="'nav.myTickets' | t"><span class="ic">🎫</span> <span class="nav-lbl">{{ 'nav.myTickets' | t }}</span></a>
        }
        <a routerLink="/chat" routerLinkActive="active" [title]="'nav.chat' | t">
          <span class="ic">💬</span> <span class="nav-lbl">{{ 'nav.chat' | t }}</span>
          @if (chatUnread() > 0) { <span class="side-badge">{{ chatUnread() }}</span> }
        </a>
        @if (auth.hasRole('Admin')) {
          <a routerLink="/reports" routerLinkActive="active" [title]="'nav.reports' | t"><span class="ic">📊</span> <span class="nav-lbl">{{ 'nav.reports' | t }}</span></a>
        }
        @if (auth.hasRole('Admin')) {
          <a routerLink="/organization" routerLinkActive="active" [title]="'nav.org'   | t"><span class="ic">🏢</span> <span class="nav-lbl">{{ 'nav.org'   | t }}</span></a>
          <a routerLink="/users"        routerLinkActive="active" [title]="'nav.users' | t"><span class="ic">◑</span>  <span class="nav-lbl">{{ 'nav.users' | t }}</span></a>
        }
        @if (auth.hasRole('Admin')) {
          <a routerLink="/ticket-categories" routerLinkActive="active" [title]="'nav.ticketCats' | t"><span class="ic">🗂</span> <span class="nav-lbl">{{ 'nav.ticketCats' | t }}</span></a>
        }
        <a routerLink="/help" routerLinkActive="active" [title]="'nav.help' | t"><span class="ic">❓</span> <span class="nav-lbl">{{ 'nav.help' | t }}</span></a>
      </nav>

      <!-- ── Branch Card (Branch-Employee only) ── -->
      @if (auth.hasRole('Branch-Employee') && myBranch()) {
        <div class="branch-card">
          <div class="bc-head">
            <span class="bc-icon">🏢</span>
            <div>
              <div class="bc-name">{{ myBranch()!.name }}</div>
              <div class="bc-area">{{ myBranch()!.areaName }}</div>
            </div>
            <span class="bc-code-badge">{{ myBranch()!.code }}</span>
          </div>
          <div class="bc-details">
            @if (myBranch()!.address) {
              <div class="bc-row"><span class="bc-ico">📍</span><span class="bc-val">{{ myBranch()!.address }}</span></div>
            }
            @if (myBranch()!.email) {
              <div class="bc-row"><span class="bc-ico">📧</span><span class="bc-val">{{ myBranch()!.email }}</span></div>
            }
            @if (myBranch()!.phone) {
              <div class="bc-row"><span class="bc-ico">📞</span><span class="bc-val">{{ myBranch()!.phone }}</span></div>
            }
          </div>
          @if (myBranch()!.devices.length > 0) {
            <div class="bc-divider"></div>
            <div class="bc-devices-head">
              <span class="bc-ico">🖥</span>
              <span>
                @if (i18n.lang() === 'ar') {
                  {{ myBranch()!.devices.length }} {{ myBranch()!.devices.length === 1 ? 'جهاز' : 'أجهزة' }}
                } @else {
                  {{ myBranch()!.devices.length }} Device{{ myBranch()!.devices.length !== 1 ? 's' : '' }}
                }
              </span>
            </div>
            <div class="bc-devices">
              @for (d of myBranch()!.devices; track d.id) {
                <div class="bc-device">
                  <div class="bc-dev-label">{{ d.label }}</div>
                  <div class="bc-dev-info">
                    <span class="bc-dev-field">AnyDesk</span>
                    <span class="bc-dev-val">{{ d.anyDeskNumber }}</span>
                  </div>
                  <div class="bc-dev-info">
                    <span class="bc-dev-field">{{ i18n.lang() === 'ar' ? 'المستخدم' : 'User' }}</span>
                    <span class="bc-dev-val">{{ d.userName }}</span>
                  </div>
                  <div class="bc-dev-info">
                    <span class="bc-dev-field">{{ i18n.lang() === 'ar' ? 'كلمة المرور' : 'Password' }}</span>
                    <span class="bc-dev-val bc-dev-pwd">{{ d.password }}</span>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      <div class="side-foot text-xs">{{ 'app.dept' | t }} · v2.1</div>
    </aside>

    <div class="main">

      <!-- ═══ TOPBAR ═══ -->
      <header class="topbar">
        <button class="btn btn-icon btn-ghost hamburger" (click)="toggleNav()" aria-label="Menu">☰</button>
        <span class="topbar-brand">{{ 'app.name' | t }}</span>
        <div class="spacer"></div>

        <button class="lang-btn" (click)="i18n.toggle()"
          [title]="i18n.lang() === 'en' ? 'Switch to Arabic' : 'Switch to English'">
          @if (i18n.lang() === 'en') { 🌐 AR } @else { 🌐 EN }
        </button>

        <button class="btn btn-icon btn-ghost theme-btn" (click)="theme.toggle()"
          [title]="theme.isDark() ? 'Switch to light mode' : 'Switch to dark mode'">
          @if (theme.isDark()) { ☀️ } @else { 🌙 }
        </button>

        @if (auth.hasRole('Admin','Technician')) {
          <button class="avail-toggle" [class.on]="available()" (click)="toggleAvailability()"
            [title]="(available() ? 'avail.on' : 'avail.off') | t">
            <span class="avail-dot"></span>
            {{ (available() ? 'avail.on' : 'avail.off') | t }}
          </button>
        }

        <div class="notif">
          <button class="btn btn-icon btn-ghost bell-btn" [class.bell-ringing]="hasNewNotif()" (click)="toggleNotif()" title="Notifications">
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
                  @if (n.message) { <div class="ni-ticket-box" dir="auto">🎫 {{ n.message }}</div> }
                  <div class="ni-time">{{ ago(n.createdAt) }}</div>
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
                <div class="dd-meta">{{ auth.user()?.email }}</div>
                @if (auth.user()?.branchName) { <div class="dd-meta">Branch: {{ auth.user()?.branchName }}</div> }
              </div>
              <button class="dd-item" (click)="logout()">{{ 'auth.signOut' | t }}</button>
            </div>
          }
        </div>
      </header>

      <!-- ═══ SMART BAR: App Links ═══ -->
      <div class="smart-bar" [class.manage-mode]="manageMode()">
        <div class="sb-links">
          @for (link of appLinks(); track link.id) {
            @if ((link.isActive && canSeeLink(link)) || manageMode()) {
              <div class="sb-chip-wrap" [class.sb-inactive]="!link.isActive && manageMode()">
                <a class="sb-chip" [href]="link.url" target="_blank" rel="noopener"
                   [style.background]="link.isActive ? link.bgColor : '#94a3b8'">
                  @if (link.imageUrl) {
                    <img class="sb-chip-img" [src]="link.imageUrl" [alt]="link.title" />
                  } @else {
                    <span class="sb-chip-icon">{{ link.icon }}</span>
                  }
                  <span class="sb-chip-label">{{ link.title }}</span>
                </a>
                @if (manageMode()) {
                  @if (link.allowedRoles) {
                    <span class="sb-roles-tag">{{ link.allowedRoles }}</span>
                  }
                  <div class="sb-chip-acts">
                    <button class="sb-act-btn sb-act-edit" (click)="editLink(link);   $event.preventDefault()">✏</button>
                    <button class="sb-act-btn sb-act-del"  (click)="deleteLink(link); $event.preventDefault()">✕</button>
                  </div>
                }
              </div>
            }
          }
        </div>
        <div class="sb-controls">
          @if (canManageBanner()) {
            @if (manageMode()) {
              <button class="sb-btn-add"  (click)="newLink()">＋ Add</button>
              <button class="sb-btn-done" (click)="manageMode.set(false)">✓ Done</button>
            } @else {
              <button class="sb-btn-gear" (click)="manageMode.set(true)" title="Manage app links">⚙</button>
            }
          }
        </div>
      </div>

      <!-- ═══ CLOCK BAR ═══ -->
      <div class="clock-bar" (click)="cycleClk()" title="Click to change clock style">
        <div class="clkb-inner">
          @switch (clkStyle()) {
            @case (0) {
              <div class="clkb-time" dir="ltr">{{ clkH() }}<span class="clkb-blink">:</span>{{ clkM() }}</div>
            }
            @case (1) {
              <div class="clkb-time clkb-time-full" dir="ltr">
                {{ clkH() }}:{{ clkM() }}<span class="clkb-sec">:{{ clkS() }}</span>
              </div>
            }
            @case (2) {
              <svg class="clkb-svg" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
                <!-- outer bezel ring -->
                <circle cx="30" cy="30" r="28" fill="rgba(0,0,0,.25)" stroke="rgba(230,180,155,.22)" stroke-width="1.5"/>
                <!-- inner dial face -->
                <circle cx="30" cy="30" r="25" fill="rgba(15,5,5,.55)" stroke="rgba(200,140,110,.1)" stroke-width=".8"/>
                @for (m of clkMarkers; track m.i) {
                  <line [attr.x1]="m.x1" [attr.y1]="m.y1" [attr.x2]="m.x2" [attr.y2]="m.y2"
                        stroke="rgba(230,195,175,.45)" [attr.stroke-width]="m.i % 3 === 0 ? 2.2 : 1"/>
                }
                <!-- hour hand — cream -->
                <line x1="30" y1="30" [attr.x2]="hhx()" [attr.y2]="hhy()" stroke="#f0e6e0" stroke-width="3.8" stroke-linecap="round"/>
                <!-- minute hand — slightly thinner -->
                <line x1="30" y1="30" [attr.x2]="mhx()" [attr.y2]="mhy()" stroke="#e8dbd4" stroke-width="2.6" stroke-linecap="round"/>
                <!-- second hand — warm orange-red accent -->
                <line x1="30" y1="30" [attr.x2]="shx()" [attr.y2]="shy()" stroke="#e8704a" stroke-width="1.6" stroke-linecap="round"/>
                <!-- center cap -->
                <circle cx="30" cy="30" r="3.2" fill="#e0705080"/>
                <circle cx="30" cy="30" r="1.6" fill="#f7ece5"/>
              </svg>
              <div class="clkb-dig-wrap">
                <div class="clkb-time clkb-time-sm" dir="ltr">{{ clkH() }}:{{ clkM() }}<span class="clkb-sec">:{{ clkS() }}</span></div>
              </div>
            }
          }
          <div class="clkb-sep"></div>
          <div class="clkb-date-block">
            <span class="clkb-dayname">{{ clkDayName() }}</span>
            <span class="clkb-datestr">{{ clkDateStr() }}</span>
            @if (i18n.lang() === 'ar') {
              <span class="clkb-hijri">{{ clkHijriStr() }}</span>
            }
          </div>
        </div>
        <span class="clkb-hint">↻</span>
      </div>

      <main class="content"><router-outlet /></main>
    </div>
  </div>

  <!-- ═══ APP LINK FORM MODAL ═══ -->
  @if (linkForm()) {
    <div class="lf-overlay" (click)="linkForm.set(false)">
      <div class="lf-modal" (click)="$event.stopPropagation()">
        <div class="lf-head">
          <strong>{{ editingLink ? 'Edit App Link' : 'New App Link' }}</strong>
          <button class="btn btn-icon btn-ghost" (click)="linkForm.set(false)">✕</button>
        </div>
        <div class="lf-body">
          <div class="lf-field">
            <label>Title *</label>
            <input class="lf-input" [(ngModel)]="lm.title" placeholder="Business Central 365" />
          </div>
          <div class="lf-field">
            <label>URL *</label>
            <input class="lf-input" [(ngModel)]="lm.url" placeholder="https://..." />
          </div>
          <div class="lf-img-section">
            <div class="lf-img-left">
              <label class="lf-label">Logo Image</label>
              <div class="lf-img-box" (click)="imgInput.click()">
                @if (lm.imageUrl) { <img [src]="lm.imageUrl" class="lf-img-preview" alt="logo" /> }
                @else { <span class="lf-img-ph">📁<br><small>Click to upload</small></span> }
              </div>
              <input #imgInput type="file" accept="image/*" style="display:none" (change)="onImageFile($event)" />
              <div class="lf-img-acts">
                <button type="button" class="btn btn-sm btn-ghost" (click)="imgInput.click()">Upload</button>
                @if (lm.imageUrl) { <button type="button" class="btn btn-sm btn-danger" (click)="lm.imageUrl = null">Remove</button> }
              </div>
            </div>
            <div class="lf-img-right">
              <label class="lf-label">— or — Emoji Icon</label>
              <input class="lf-input lf-icon-in" [(ngModel)]="lm.icon" maxlength="4" placeholder="🔗" [disabled]="!!lm.imageUrl" />
              <span class="lf-hint">Ignored when image is set</span>
            </div>
          </div>
          <div class="lf-row">
            <div class="lf-field">
              <label>Badge Color</label>
              <div class="lf-color-row">
                <input type="color" class="lf-color-pick" [(ngModel)]="lm.bgColor" />
                <input class="lf-input" [(ngModel)]="lm.bgColor" placeholder="#2563eb" style="flex:1" />
              </div>
            </div>
            <div class="lf-field">
              <label>Order</label>
              <input class="lf-input" type="number" [(ngModel)]="lm.displayOrder" min="0" />
            </div>
          </div>
          <div class="lf-check">
            <input type="checkbox" id="linkActive" [(ngModel)]="lm.isActive" />
            <label for="linkActive">Active (visible in banner)</label>
          </div>
          <div class="lf-field lf-roles-field">
            <label>Visible to Roles <span class="lf-roles-hint">(leave all unchecked = everyone)</span></label>
            <div class="lf-roles">
              @for (r of allRoles; track r) {
                <label class="lf-role-chip" [class.on]="(lm.allowedRoles ?? '').split(',').includes(r)">
                  <input type="checkbox" [checked]="(lm.allowedRoles ?? '').split(',').includes(r)" (change)="toggleRole(r)" />
                  {{ r }}
                </label>
              }
            </div>
          </div>
          <div class="lf-preview-row">
            <span class="lf-preview-label">Preview:</span>
            <a class="sb-chip" [style.background]="lm.bgColor || '#2563eb'" style="pointer-events:none">
              @if (lm.imageUrl) { <img class="sb-chip-img" [src]="lm.imageUrl" alt="" /> }
              @else { <span class="sb-chip-icon">{{ lm.icon || '🔗' }}</span> }
              <span class="sb-chip-label">{{ lm.title || 'Preview' }}</span>
            </a>
          </div>
          @if (linkError()) { <div class="lf-err">{{ linkError() }}</div> }
        </div>
        <div class="lf-foot">
          <button class="btn btn-ghost" (click)="linkForm.set(false)">Cancel</button>
          <button class="btn btn-primary" (click)="saveLink()">Save</button>
        </div>
      </div>
    </div>
  }

  <!-- ═══ GUIDELINES FIXED STRIP ═══ -->
  @if (canManage() || guidelineLoading() || activeGuidelineCount() > 0) {
    <div class="guide-strip" [class.guide-strip-open]="disclaimerOpen()" [class.is-rtl]="i18n.dir() === 'rtl'">

      <!-- ── Panel ── -->
      <div class="guide-panel">

        <div class="guide-panel-head">
          <div class="guide-panel-title">
            <span>📋</span>
            <span>{{ i18n.lang() === 'ar' ? 'التعليمات العامة' : 'Public Guidelines' }}</span>
          </div>
          @if (canManage()) {
            <button class="disc-add-btn" (click)="newGuideline()"
                    [title]="i18n.lang() === 'ar' ? 'إضافة تعليمة' : 'Add guideline'">
              {{ i18n.lang() === 'ar' ? '＋ إضافة' : '＋ Add' }}
            </button>
          }
        </div>

        <div class="guide-panel-list">
          @if (guidelineLoading()) {
            <div class="disc-spin"></div>
          } @else if (guidelines().length === 0) {
            <div class="disc-empty">{{ i18n.lang() === 'ar' ? 'لا توجد تعليمات بعد' : 'No guidelines yet.' }}</div>
          } @else {
            @for (g of guidelines(); track g.id) {
              @if (g.isActive || canManage()) {
                <div class="guide-item" [class.guide-item-inactive]="!g.isActive">
                  <div class="disc-item-head">
                    <div class="disc-item-num">{{ $index + 1 }}</div>
                    <div class="disc-item-title" dir="auto">{{ g.title }}</div>
                    @if (canManage()) {
                      <div class="disc-item-acts">
                        @if (!g.isActive) { <span class="disc-inactive-tag">{{ i18n.lang() === 'ar' ? 'مخفية' : 'Hidden' }}</span> }
                        <button class="disc-act-btn disc-edit" (click)="editGuideline(g)" title="Edit">✏</button>
                        <button class="disc-act-btn disc-del"  (click)="deleteGuideline(g)" title="Delete">✕</button>
                      </div>
                    }
                  </div>
                  <div class="disc-item-body" dir="auto">{{ g.body }}</div>
                </div>
              }
            }
          }
        </div>

        @if (canManage() && gForm()) {
          <div class="disc-form">
            <div class="disc-form-head">
              <strong>{{ editingGuideline ? (i18n.lang() === 'ar' ? 'تعديل التعليمة' : 'Edit Guideline') : (i18n.lang() === 'ar' ? 'تعليمة جديدة' : 'New Guideline') }}</strong>
              <button class="btn btn-icon btn-ghost" (click)="gForm.set(false)">✕</button>
            </div>
            <div class="lf-field">
              <label>{{ i18n.lang() === 'ar' ? 'العنوان *' : 'Title *' }}</label>
              <input class="lf-input" [(ngModel)]="gm.title" dir="auto"
                     [placeholder]="i18n.lang() === 'ar' ? 'عنوان التعليمة...' : 'Guideline title...'" />
            </div>
            <div class="lf-field">
              <label>{{ i18n.lang() === 'ar' ? 'المحتوى *' : 'Body *' }}</label>
              <textarea class="lf-input disc-textarea" [(ngModel)]="gm.body" dir="auto" rows="4"
                        [placeholder]="i18n.lang() === 'ar' ? 'تفاصيل التعليمة...' : 'Guideline details...'"></textarea>
            </div>
            <div class="lf-row" style="align-items:center;gap:.75rem">
              <div class="lf-field" style="flex:0 0 90px">
                <label>{{ i18n.lang() === 'ar' ? 'الترتيب' : 'Order' }}</label>
                <input class="lf-input" type="number" [(ngModel)]="gm.displayOrder" min="0" />
              </div>
              <div class="lf-check" style="margin-top:1.1rem">
                <input type="checkbox" id="gActive" [(ngModel)]="gm.isActive" />
                <label for="gActive">{{ i18n.lang() === 'ar' ? 'نشطة (مرئية للجميع)' : 'Active (visible to all)' }}</label>
              </div>
            </div>
            @if (gError()) { <div class="lf-err">{{ gError() }}</div> }
            <div class="disc-form-foot">
              <button class="btn btn-ghost btn-sm" (click)="gForm.set(false)">{{ i18n.lang() === 'ar' ? 'إلغاء' : 'Cancel' }}</button>
              <button class="btn btn-primary btn-sm" (click)="saveGuideline()">{{ i18n.lang() === 'ar' ? 'حفظ' : 'Save' }}</button>
            </div>
          </div>
        }
      </div>

      <!-- ── Toggle tab on the right edge ── -->
      <button class="guide-tab"
              (click)="disclaimerOpen() ? closeDisclaimer() : disclaimerOpen.set(true)"
              [title]="disclaimerOpen() ? (i18n.lang() === 'ar' ? 'إخفاء التعليمات' : 'Hide guidelines') : (i18n.lang() === 'ar' ? 'إظهار التعليمات' : 'Show guidelines')">
        <span class="guide-tab-icon">📋</span>
        @if (activeGuidelineCount() > 0) {
          <span class="guide-tab-badge">{{ activeGuidelineCount() }}</span>
        }
        <span class="guide-tab-label">{{ i18n.lang() === 'ar' ? 'تعليمات' : 'Guidelines' }}</span>
        <span class="guide-tab-chevron" [class.open]="disclaimerOpen()">◂</span>
      </button>

    </div>
  }
  `
})
export class Shell implements OnInit, OnDestroy {
  auth   = inject(AuthService);
  i18n   = inject(I18nService);
  theme  = inject(ThemeService);
  private notifSvc    = inject(NotificationService);
  private chatSvc     = inject(ChatService);
  private userSvc     = inject(UserService);
  private appLinksSvc = inject(AppLinksService);
  private guidelinesSvc = inject(GuidelinesService);
  private orgSvc      = inject(OrganizationService);
  toast = inject(ToastService);
  private router      = inject(Router);

  unread        = signal(0);
  hasNewNotif   = signal(false);
  private lastKnownUnread = -1;
  chatUnread    = this.chatSvc.chatUnread; // shared signal from ChatService
  notifications = signal<Notification[]>([]);
  notifOpen     = signal(false);
  userOpen      = signal(false);
  sidebarOpen   = signal(false);
  sidebarCollapsed = signal(localStorage.getItem('ats-nav-collapsed') === '1');
  available     = signal(false);
  logoErr       = false;
  private timer?: any;
  private clockTimer?: any;
  private docHandler = () => { this.notifOpen.set(false); this.userOpen.set(false); };

  // App links
  appLinks    = signal<AppLink[]>([]);
  manageMode  = signal(false);
  linkForm    = signal(false);
  linkError   = signal('');
  editingLink = false;
  editLinkId?: number;
  lm: any = {};
  canManage       = () => this.auth.hasRole('Admin');
  canManageBanner = () => this.auth.hasRole('Admin');
  readonly allRoles = ['Admin', 'Technician', 'Branch-Employee', 'HO-Employee', 'Cam-Employee'];

  canSeeLink(l: AppLink) {
    if (!l.allowedRoles) return true;
    const roles = l.allowedRoles.split(',').map(r => r.trim()).filter(Boolean);
    if (roles.length === 0) return true;
    return roles.includes(this.auth.user()?.role ?? '');
  }

  toggleRole(r: string) {
    const roles: string[] = (this.lm.allowedRoles ?? '').split(',').map((x: string) => x.trim()).filter(Boolean);
    const idx = roles.indexOf(r);
    if (idx >= 0) roles.splice(idx, 1); else roles.push(r);
    this.lm = { ...this.lm, allowedRoles: roles.join(',') };
  }

  // Branch card (employee)
  myBranch = signal<BranchPublic | null>(null);

  // Guidelines / Disclaimer
  guidelines       = signal<Guideline[]>([]);
  activeGuidelineCount = computed(() => this.guidelines().filter(g => g.isActive).length);
  guidelineLoading = signal(false);
  disclaimerOpen  = signal(true);
  gForm           = signal(false);
  gError          = signal('');
  editingGuideline = false;
  editGuidelineId?: number;
  gm: any = {};

  // ── Clock ──────────────────────────────────────────────
  private readonly CLK_KEY = 'ats-clk-style';
  clkStyle = signal<0|1|2>((+(localStorage.getItem(this.CLK_KEY) ?? '0')) as 0|1|2);
  private now = signal(new Date());

  private clkHNum = computed(() => this.now().getHours());
  private clkMNum = computed(() => this.now().getMinutes());
  private clkSNum = computed(() => this.now().getSeconds());

  private ar = computed(() => this.i18n.lang() === 'ar');
  private toAr = (s: string) => s.replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
  private fmt2 = (n: number) => String(n).padStart(2, '0');

  clkH = computed(() => this.fmt2(this.clkHNum()));
  clkM = computed(() => this.fmt2(this.clkMNum()));
  clkS = computed(() => this.fmt2(this.clkSNum()));

  clkDayName  = computed(() => this.now().toLocaleDateString(this.ar() ? 'ar-SA' : 'en-GB', { weekday: 'long' }));
  clkDateStr  = computed(() => this.now().toLocaleDateString(this.ar() ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));
  clkHijriStr = computed(() => {
    if (!this.ar()) return '';
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(this.now());
  });

  private hourAngle = computed(() => (this.clkHNum() % 12) * 30 + this.clkMNum() * 0.5);
  private minAngle  = computed(() => this.clkMNum() * 6 + this.clkSNum() * 0.1);
  private secAngle  = computed(() => this.clkSNum() * 6);

  hhx = computed(() => +(30 + 15 * Math.sin(this.hourAngle() * Math.PI / 180)).toFixed(2));
  hhy = computed(() => +(30 - 15 * Math.cos(this.hourAngle() * Math.PI / 180)).toFixed(2));
  mhx = computed(() => +(30 + 21 * Math.sin(this.minAngle()  * Math.PI / 180)).toFixed(2));
  mhy = computed(() => +(30 - 21 * Math.cos(this.minAngle()  * Math.PI / 180)).toFixed(2));
  shx = computed(() => +(30 + 24 * Math.sin(this.secAngle()  * Math.PI / 180)).toFixed(2));
  shy = computed(() => +(30 - 24 * Math.cos(this.secAngle()  * Math.PI / 180)).toFixed(2));

  clkMarkers = Array.from({ length: 12 }, (_, i) => {
    const a = i * 30 * Math.PI / 180;
    const outer = i % 3 === 0 ? 27 : 25;
    return { i,
      x1: +(30 + 22 * Math.sin(a)).toFixed(2), y1: +(30 - 22 * Math.cos(a)).toFixed(2),
      x2: +(30 + outer * Math.sin(a)).toFixed(2), y2: +(30 - outer * Math.cos(a)).toFixed(2),
    };
  });

  cycleClk() {
    const next = ((this.clkStyle() + 1) % 3) as 0|1|2;
    this.clkStyle.set(next);
    localStorage.setItem(this.CLK_KEY, String(next));
  }
  // ── /Clock ─────────────────────────────────────────────

  ngOnInit() {
    this.available.set(this.auth.user()?.isAvailable ?? false);
    this.refreshCounts();
    this.loadLinks();
    this.loadGuidelines();
    if (this.auth.hasRole('Branch-Employee')) this.loadMyBranch();
    this.timer      = setInterval(() => this.refreshCounts(), 20000);
    this.clockTimer = setInterval(() => this.now.set(new Date()), 1000);
    document.addEventListener('click', this.docHandler);
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.sidebarOpen.set(false);
      this.notifOpen.set(false);
      this.userOpen.set(false);
    });
  }
  ngOnDestroy() {
    clearInterval(this.timer);
    clearInterval(this.clockTimer);
    document.removeEventListener('click', this.docHandler);
  }

  ini = initials;
  ago = timeAgo;

  loadLinks()    { this.appLinksSvc.getAll().subscribe(l => this.appLinks.set(l)); }
  loadMyBranch() { this.orgSvc.getMyBranch().subscribe(b => this.myBranch.set(b)); }

  loadGuidelines() {
    this.guidelineLoading.set(true);
    this.guidelinesSvc.getAll().subscribe({
      next: g => { this.guidelines.set(g); this.guidelineLoading.set(false); },
      error: () => this.guidelineLoading.set(false)
    });
  }

  refreshCounts() {
    this.notifSvc.unreadCount().subscribe(c => {
      if (c > 0 && c > this.lastKnownUnread) this.hasNewNotif.set(true);
      this.lastKnownUnread = c;
      this.unread.set(c);
    });
    this.chatSvc.refreshUnread();
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
    const o = !this.notifOpen(); setTimeout(() => this.notifOpen.set(o));
    this.userOpen.set(false);
    if (o) {
      this.hasNewNotif.set(false);
      this.lastKnownUnread = this.unread();
      this.notifSvc.getMine().subscribe(n => this.notifications.set(n));
    }
  }
  toggleUser() { const o = !this.userOpen(); setTimeout(() => this.userOpen.set(o)); this.notifOpen.set(false); }
  toggleNav() {
    if (window.innerWidth <= 860) {
      this.sidebarOpen.set(!this.sidebarOpen());
    } else {
      const next = !this.sidebarCollapsed();
      this.sidebarCollapsed.set(next);
      localStorage.setItem('ats-nav-collapsed', next ? '1' : '0');
    }
  }
  markAll() {
    this.notifSvc.markAllRead().subscribe(() => {
      this.unread.set(0);
      this.notifications.update(ns => ns.map(n => ({ ...n, isRead: true })));
    });
  }
  open(n: Notification) {
    if (!n.isRead) this.notifSvc.markRead(n.id).subscribe(() => this.refreshCounts());
    this.notifOpen.set(false);
    if (n.taskId) this.router.navigate(['/tasks', n.taskId]);
    else this.router.navigate(['/chat']);
  }
  logout() { this.auth.logout(); this.router.navigate(['/login']); }

  // App links CRUD
  newLink() {
    this.editingLink = false; this.linkError.set('');
    this.lm = { title: '', url: '', icon: '🔗', imageUrl: null, bgColor: '#2563eb', displayOrder: this.appLinks().length, isActive: true, allowedRoles: '' };
    this.linkForm.set(true);
  }
  editLink(l: AppLink) {
    this.editingLink = true; this.editLinkId = l.id; this.linkError.set('');
    this.lm = { ...l, imageUrl: l.imageUrl ?? null, allowedRoles: l.allowedRoles ?? '' };
    this.linkForm.set(true);
  }
  onImageFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => { this.lm = { ...this.lm, imageUrl: r.result as string }; };
    r.readAsDataURL(file);
  }
  saveLink() {
    if (!this.lm.title?.trim() || !this.lm.url?.trim()) { this.linkError.set('Title and URL are required.'); return; }
    const payload = { ...this.lm, displayOrder: +(this.lm.displayOrder ?? 0), imageUrl: this.lm.imageUrl || null };
    const obs = this.editingLink && this.editLinkId
      ? this.appLinksSvc.update(this.editLinkId, payload)
      : this.appLinksSvc.create(payload);
    obs.subscribe({
      next: () => { this.linkForm.set(false); this.loadLinks(); },
      error: e => this.linkError.set(e?.error?.title ?? e?.error?.detail ?? e?.statusText ?? `Error ${e?.status}`)
    });
  }
  deleteLink(l: AppLink) {
    if (!confirm(`Remove "${l.title}" from the banner?`)) return;
    this.appLinksSvc.delete(l.id).subscribe({ next: () => this.loadLinks(), error: () => this.toast.error('Failed to delete.') });
  }

  // Guidelines CRUD
  closeDisclaimer() { this.disclaimerOpen.set(false); this.gForm.set(false); }

  newGuideline() {
    this.editingGuideline = false; this.gError.set('');
    this.gm = { title: '', body: '', displayOrder: this.guidelines().length, isActive: true };
    this.gForm.set(true);
  }
  editGuideline(g: Guideline) {
    this.editingGuideline = true; this.editGuidelineId = g.id; this.gError.set('');
    this.gm = { ...g };
    this.gForm.set(true);
  }
  saveGuideline() {
    if (!this.gm.title?.trim() || !this.gm.body?.trim()) { this.gError.set('Title and body are required.'); return; }
    const payload = { ...this.gm, displayOrder: +(this.gm.displayOrder ?? 0) };
    const obs = this.editingGuideline && this.editGuidelineId
      ? this.guidelinesSvc.update(this.editGuidelineId, payload)
      : this.guidelinesSvc.create(payload);
    obs.subscribe({
      next: () => { this.gForm.set(false); this.loadGuidelines(); },
      error: e => {
        const detail = e?.error?.title ?? e?.error?.detail ?? e?.error?.message;
        this.gError.set(detail ? `${detail}` : `HTTP ${e?.status ?? 0} – ${e?.statusText || 'Failed to save.'}`);
      }
    });
  }
  deleteGuideline(g: Guideline) {
    if (!confirm(`Delete guideline "${g.title}"?`)) return;
    this.guidelinesSvc.delete(g.id).subscribe({ next: () => this.loadGuidelines() });
  }
}
