import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { UserService, OrganizationService, TicketCategoryService, ExcelService, DepartmentService } from '../../core/services/data.services';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { Branch, Department, ImportResult, Role, TicketCategory, User } from '../../core/models/models';
import { initials } from '../../shared/util';
import { ToastService } from '../../core/services/toast.service';
import { ColFilter, FilterOption } from '../../shared/col-filter/col-filter';

@Component({
  selector: 'app-users',
  imports: [FormsModule, DatePipe, TranslatePipe, ColFilter],
  styleUrl: './users.scss',
  template: `
  <div class="page" [attr.dir]="i18n.dir()">
    <div class="page-header">
      <h2>{{ 'usr.title' | t }}</h2>
      <div class="flex gap-1 items-center flex-wrap">
        <label class="chk"><input type="checkbox" [(ngModel)]="includeInactive" (ngModelChange)="load()" /> {{ 'usr.showInactive' | t }}</label>
        @if (isAdmin()) {
          <button class="btn btn-ghost" (click)="xlDownload()">{{ 'xl.export' | t }}</button>
          <label class="btn btn-ghost" [class.loading]="importing()">
            {{ 'xl.import' | t }}
            <input type="file" accept=".xlsx,.xls" style="display:none" (change)="xlImport($event)" />
          </label>
          <button class="btn btn-primary" (click)="openNew()">+ {{ 'usr.newUser' | t }}</button>
        }
      </div>
    </div>

    @if (importResult()) {
      <div class="import-bar" [class.has-errors]="(importResult()?.failed ?? 0) > 0">
        <span>
          @if ((importResult()?.imported ?? 0) > 0) { ✓ {{ importResult()?.imported }} {{ 'xl.imported' | t }} }
          @if ((importResult()?.updated ?? 0) > 0) { &nbsp;· ✏ {{ importResult()?.updated }} {{ 'xl.updated' | t }} }
          @if ((importResult()?.failed ?? 0) > 0) { &nbsp;· ✗ {{ importResult()?.failed }} {{ 'xl.failed' | t }} }
        </span>
        <button class="btn btn-sm btn-ghost" (click)="importResult.set(null)">✕</button>
      </div>
      @if (importResult()!.errors.length) {
        <div class="card import-errors">
          @for (e of importResult()!.errors; track $index) {
            <div class="ie-row">{{ e }}</div>
          }
        </div>
      }
    }

    @if (hasActiveUserFilters()) {
      <div class="active-filters">
        <span class="text-sm muted">{{ 'task.filtersActive' | t }}</span>
        <button class="btn btn-sm btn-ghost" (click)="clearUserFilters()">✕ {{ 'task.clearFilters' | t }}</button>
      </div>
    }

    <div class="card">
      @if (loading()) { <div class="spin"></div> } @else {
        <table class="table">
          <thead>
            <tr>
              <th>{{ 'usr.name' | t }}</th><th>{{ 'usr.username' | t }}</th><th>{{ 'usr.role' | t }}</th>
              <th>{{ 'usr.branch' | t }}</th><th>{{ 'usr.dept' | t }}</th><th>{{ 'usr.lastLogin' | t }}</th>
              <th>{{ 'task.status' | t }}</th>@if (isAdmin()){<th></th>}
            </tr>
            <tr class="filter-row">
              <th>
                <input class="col-filter-input" placeholder="{{ 'usr.name' | t }}"
                  [ngModel]="nameFilter()" (ngModelChange)="nameFilter.set($event)" />
              </th>
              <th>
                <input class="col-filter-input" placeholder="{{ 'usr.username' | t }}"
                  [ngModel]="usernameFilter()" (ngModelChange)="usernameFilter.set($event)" />
              </th>
              <th>
                <app-col-filter
                  [options]="roleOpts()"
                  [multi]="true"
                  [values]="roleFilter()"
                  (valuesChange)="roleFilter.set($event)"
                  [placeholder]="i18n.t('usr.allRoles')" />
              </th>
              <th>
                <app-col-filter
                  [options]="branchOpts()"
                  [multi]="true"
                  [values]="branchFilter()"
                  (valuesChange)="branchFilter.set($event)"
                  [placeholder]="i18n.t('usr.allBranches')" />
              </th>
              <th>
                <app-col-filter
                  [options]="deptOpts()"
                  [multi]="true"
                  [values]="deptFilter()"
                  (valuesChange)="deptFilter.set($event)"
                  [placeholder]="i18n.t('usr.allDepts')" />
              </th>
              <th></th>
              <th>
                <app-col-filter
                  [options]="statusOpts()"
                  [multi]="true"
                  [values]="statusFilter()"
                  (valuesChange)="statusFilter.set($event)"
                  [placeholder]="i18n.t('usr.allStatuses')"
                  [alignEnd]="true" />
              </th>
              @if (isAdmin()){<th></th>}
            </tr>
          </thead>
          <tbody>
            @for (u of filteredUsers(); track u.id) {
              <tr [class.inactive]="!u.isActive">
                <td><span class="flex items-center gap-1"><span class="avatar sm" [style.background]="u.avatarColor || '#64748b'">{{ ini(u.fullName) }}</span> {{ u.fullName }}</span></td>
                <td class="text-sm">{{ u.userName }}</td>
                <td><span class="badge st-ToDo">{{ u.roleName }}</span></td>
                <td class="text-sm">
                  @if (u.roleName === 'Cam-Employee' && u.branchNames?.length) {
                    {{ u.branchNames.join(', ') }}
                  } @else {
                    {{ u.branchName || '—' }}<br><span class="text-xs muted">{{ u.areaName }}</span>
                  }
                </td>
                <td class="text-sm">{{ u.departmentName || '—' }}</td>
                <td class="text-sm">{{ u.lastLoginAt ? (u.lastLoginAt | date:'short') : ('c.never' | t) }}</td>
                <td>@if (u.isActive) { <span class="badge st-Done">{{ 'usr.active' | t }}</span> } @else { <span class="badge st-Cancelled">{{ 'usr.inactive' | t }}</span> }</td>
                @if (isAdmin()) {
                  <td><div class="flex gap-1">
                    <button class="btn btn-sm btn-ghost" (click)="openEdit(u)">{{ 'c.edit' | t }}</button>
                    <button class="btn btn-sm btn-ghost" (click)="resetPw(u)">{{ 'usr.resetPw' | t }}</button>
                    <button class="btn btn-sm btn-danger" (click)="confirmPurge(u)">{{ 'usr.purge' | t }}</button>
                  </div></td>
                }
              </tr>
            } @empty { <tr><td [attr.colspan]="isAdmin() ? 8 : 7"><div class="empty">{{ 'c.empty' | t }}</div></td></tr> }
          </tbody>
        </table>
      }
    </div>
  </div>

  @if (showForm()) {
    <div class="overlay" (click)="showForm.set(false)">
      <div class="modal card" (click)="$event.stopPropagation()">

        <div class="modal-head">
          <h3>{{ editing ? ('c.edit' | t) : ('usr.newUser' | t) }}</h3>
          <button class="btn btn-icon btn-ghost" (click)="showForm.set(false)">✕</button>
        </div>

        <div class="modal-body">

          <!-- ── Identity ── -->
          <div class="modal-section">
            <div class="form-row">
              <div class="field"><label>{{ 'usr.name' | t }} *</label><input class="input" [(ngModel)]="model.fullName" /></div>
              <div class="field"><label>{{ 'usr.username' | t }} @if (!editing) { * }</label><input class="input" [(ngModel)]="model.userName" [disabled]="editing" [class.input-disabled]="editing" /></div>
            </div>
            @if (!editing) {
              <div class="form-row">
                <div class="field"><label>{{ 'usr.email' | t }} *</label><input class="input" type="email" [(ngModel)]="model.email" /></div>
                <div class="field"><label>{{ 'auth.password' | t }} *</label><input class="input" type="password" [(ngModel)]="model.password" /></div>
              </div>
            } @else {
              <div class="field"><label>{{ 'usr.email' | t }} *</label><input class="input" type="email" [(ngModel)]="model.email" /></div>
            }
          </div>

          <hr class="modal-divider" />

          <!-- ── Role & Location ── -->
          <div class="modal-section">
            <div class="form-row">
              <div class="field"><label>{{ 'usr.role' | t }}</label>
                <select [(ngModel)]="model.roleId">
                  @for (r of roles(); track r.id) {
                    @if (!['Employee','Viewer','Manager'].includes(r.name) || r.id === model.roleId) {
                      <option [ngValue]="r.id">{{ r.name }}</option>
                    }
                  }
                </select>
              </div>
              @if (!isCamRole()) {
                <div class="field"><label>{{ 'usr.branch' | t }}</label>
                  <select [(ngModel)]="model.branchId">
                    <option [ngValue]="null">— {{ 'c.none' | t }} —</option>
                    @for (b of branches(); track b.id) { <option [ngValue]="b.id">{{ b.name }} ({{ b.areaName }})</option> }
                  </select>
                </div>
              }
            </div>
            @if (isCamRole()) {
              <div class="field">
                <label>{{ 'usr.branches' | t }}</label>
                <div class="cat-check-list">
                  @for (b of branches(); track b.id) {
                    <label class="cat-check-item">
                      <input type="checkbox" [checked]="model.branchIds?.includes(b.id)" (change)="toggleBranch(b.id, $event)" />
                      <span class="cat-check-name">{{ b.name }} <span class="text-xs muted">({{ b.areaName }})</span></span>
                    </label>
                  }
                </div>
              </div>
            }
          </div>

          <hr class="modal-divider" />

          <!-- ── Details ── -->
          <div class="modal-section">
            <div class="form-row-3">
              <div class="field"><label>{{ 'usr.dept' | t }}</label>
                <select [(ngModel)]="model.departmentId">
                  <option [ngValue]="null">— {{ 'c.none' | t }} —</option>
                  @for (d of departments(); track d.id) { <option [ngValue]="d.id">{{ d.name }}</option> }
                </select>
              </div>
              <div class="field"><label>{{ 'usr.jobTitle' | t }}</label><input class="input" [(ngModel)]="model.jobTitle" /></div>
              <div class="field"><label>{{ 'usr.phone' | t }}</label><input class="input" [(ngModel)]="model.phoneNumber" /></div>
            </div>
          </div>

          <hr class="modal-divider" />

          <!-- ── Ticket Categories ── -->
          @if (isTechnicianRole()) {
            <div class="modal-section">
              <div class="field">
                <label>{{ 'usr.category' | t }}</label>
                <div class="cat-check-list">
                  @for (c of categories(); track c.id) {
                    @if (c.isActive) {
                      <label class="cat-check-item">
                        <input type="checkbox" [checked]="model.categoryIds?.includes(c.id)" (change)="toggleCat(c.id, $event)" />
                        <span class="cat-check-icon" [style.background]="c.color + '22'" [style.border-color]="c.color + '55'">{{ c.icon }}</span>
                        <span class="cat-check-name">{{ c.name }}</span>
                      </label>
                    }
                  }
                </div>
              </div>
            </div>
          } @else {
            <div class="modal-section">
              <div class="field">
                <label>{{ 'usr.issuableCategories' | t }}</label>
                <p class="field-hint">{{ i18n.lang() === 'ar' ? 'اترك فارغاً للسماح بجميع الأنواع' : 'Leave empty to allow all ticket types' }}</p>
                <div class="cat-check-list">
                  @for (c of categories(); track c.id) {
                    @if (c.isActive) {
                      <label class="cat-check-item">
                        <input type="checkbox" [checked]="model.issuableCategoryIds?.includes(c.id)" (change)="toggleIssuableCat(c.id, $event)" />
                        <span class="cat-check-icon" [style.background]="c.color + '22'" [style.border-color]="c.color + '55'">{{ c.icon }}</span>
                        <span class="cat-check-name">{{ c.name }}</span>
                      </label>
                    }
                  }
                </div>
              </div>
            </div>
          }

          <!-- ── Status + Error ── -->
          @if (editing) {
            <label class="chk"><input type="checkbox" [(ngModel)]="model.isActive" /> {{ 'usr.active' | t }}</label>
          }
          @if (error()) { <div class="err">{{ error() }}</div> }

        </div>

        <div class="modal-foot">
          <button class="btn btn-ghost" (click)="showForm.set(false)">{{ 'c.cancel' | t }}</button>
          <button class="btn btn-primary" (click)="save()" [disabled]="saving()">{{ 'c.save' | t }}</button>
        </div>

      </div>
    </div>
  }

  @if (purgeTarget()) {
    <div class="overlay" (click)="purgeTarget.set(null)">
      <div class="modal card purge-modal" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <h3>⚠ {{ 'usr.purge' | t }}</h3>
          <button class="btn btn-icon btn-ghost" (click)="purgeTarget.set(null)">✕</button>
        </div>
        <div class="modal-body">
          <div class="purge-avatar">
            <span class="avatar lg" [style.background]="purgeTarget()!.avatarColor || '#64748b'">{{ ini(purgeTarget()!.fullName) }}</span>
            <strong>{{ purgeTarget()!.fullName }}</strong>
            <span class="text-sm muted">{{ purgeTarget()!.email }}</span>
          </div>
          <div class="purge-warning">{{ 'usr.purgeConfirm' | t }}</div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" (click)="purgeTarget.set(null)">{{ 'c.cancel' | t }}</button>
          <button class="btn btn-danger" (click)="purge()" [disabled]="purging()">{{ 'usr.purge' | t }}</button>
        </div>
      </div>
    </div>
  }
  `
})
export class Users implements OnInit {
  private svc = inject(UserService);
  private orgSvc = inject(OrganizationService);
  private catSvc = inject(TicketCategoryService);
  private deptSvc = inject(DepartmentService);
  private auth = inject(AuthService);
  private xlSvc = inject(ExcelService);
  toast = inject(ToastService);
  i18n = inject(I18nService);

  users      = signal<User[]>([]);
  roles      = signal<Role[]>([]);
  branches   = signal<Branch[]>([]);
  categories = signal<TicketCategory[]>([]);
  departments = signal<Department[]>([]);
  loading    = signal(true);
  showForm   = signal(false);
  saving     = signal(false);
  error      = signal('');
  importing  = signal(false);
  importResult = signal<ImportResult | null>(null);
  purgeTarget  = signal<User | null>(null);
  purging      = signal(false);
  includeInactive = false;
  editing = false;
  editId?: number;
  model: any = {};

  ini = initials;
  isAdmin          = () => this.auth.hasRole('Admin');
  isTechnicianRole = () => this.roles().find(r => r.id === this.model.roleId)?.name === 'Technician';
  isCamRole        = () => this.roles().find(r => r.id === this.model.roleId)?.name === 'Cam-Employee';

  // ── Per-column filter signals (multi-select) ─────────────
  nameFilter     = signal('');
  usernameFilter = signal('');
  roleFilter     = signal<number[]>([]);
  branchFilter   = signal<number[]>([]);
  deptFilter     = signal<number[]>([]);
  statusFilter   = signal<string[]>([]);

  // ── Filter option arrays (reactive to data + i18n) ───────
  roleOpts = computed<FilterOption[]>(() =>
    this.roles().map(r => ({ value: r.id, label: r.name }))
  );
  branchOpts = computed<FilterOption[]>(() =>
    this.branches().map(b => ({ value: b.id, label: b.name }))
  );
  deptOpts = computed<FilterOption[]>(() =>
    this.departments().map(d => ({ value: d.id, label: d.name }))
  );
  statusOpts = computed<FilterOption[]>(() => [
    { value: 'active',   label: this.i18n.t('usr.active') },
    { value: 'inactive', label: this.i18n.t('usr.inactive') }
  ]);

  filteredUsers = computed(() => {
    const name   = this.nameFilter().trim().toLowerCase();
    const uname  = this.usernameFilter().trim().toLowerCase();
    const roles  = this.roleFilter();
    const brnch  = this.branchFilter();
    const depts  = this.deptFilter();
    const stts   = this.statusFilter();
    return this.users().filter(u =>
      (!name   || u.fullName.toLowerCase().includes(name)) &&
      (!uname  || u.userName.toLowerCase().includes(uname)) &&
      (!roles.length  || roles.includes(u.roleId)) &&
      (!brnch.length  || brnch.some(b => u.branchId === b || u.branchIds?.includes(b))) &&
      (!depts.length  || (u.departmentId != null && depts.includes(u.departmentId))) &&
      (!stts.length   || stts.includes(u.isActive ? 'active' : 'inactive'))
    );
  });

  hasActiveUserFilters(): boolean {
    return !!(this.nameFilter() || this.usernameFilter() ||
      this.roleFilter().length || this.branchFilter().length ||
      this.deptFilter().length || this.statusFilter().length);
  }

  clearUserFilters() {
    this.nameFilter.set(''); this.usernameFilter.set('');
    this.roleFilter.set([]); this.branchFilter.set([]);
    this.deptFilter.set([]); this.statusFilter.set([]);
  }

  ngOnInit() {
    this.svc.roles().subscribe(r => this.roles.set(r));
    this.orgSvc.getBranches().subscribe(b => this.branches.set(b));
    this.catSvc.getAll().subscribe(c => this.categories.set(c));
    this.deptSvc.getAll().subscribe(d => this.departments.set(d));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.svc.getAll(this.includeInactive).subscribe(u => { this.users.set(u); this.loading.set(false); });
  }

  openNew() {
    this.editing = false; this.error.set('');
    this.model = { fullName: '', userName: '', email: '', password: '', roleId: this.roles()[0]?.id, isActive: true, categoryIds: [], branchIds: [], issuableCategoryIds: [] };
    this.showForm.set(true);
  }
  openEdit(u: User) {
    this.editing = true; this.editId = u.id; this.error.set('');
    this.model = { ...u, categoryIds: [...(u.categoryIds ?? [])], branchIds: [...(u.branchIds ?? [])], issuableCategoryIds: [...(u.issuableCategoryIds ?? [])] };
    this.showForm.set(true);
  }

  toggleCat(id: number, e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    if (!this.model.categoryIds) this.model.categoryIds = [];
    if (checked) { if (!this.model.categoryIds.includes(id)) this.model.categoryIds.push(id); }
    else          { this.model.categoryIds = this.model.categoryIds.filter((x: number) => x !== id); }
  }

  toggleIssuableCat(id: number, e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    if (!this.model.issuableCategoryIds) this.model.issuableCategoryIds = [];
    if (checked) { if (!this.model.issuableCategoryIds.includes(id)) this.model.issuableCategoryIds.push(id); }
    else          { this.model.issuableCategoryIds = this.model.issuableCategoryIds.filter((x: number) => x !== id); }
  }

  toggleBranch(id: number, e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    if (!this.model.branchIds) this.model.branchIds = [];
    if (checked) { if (!this.model.branchIds.includes(id)) this.model.branchIds.push(id); }
    else          { this.model.branchIds = this.model.branchIds.filter((x: number) => x !== id); }
  }

  save() {
    if (!this.model.fullName?.trim() || !this.model.email?.trim()) { this.error.set('Name and email are required.'); return; }
    if (!this.editing && (!this.model.userName?.trim() || !this.model.password)) { this.error.set('Username and password are required.'); return; }
    this.saving.set(true); this.error.set('');
    const obs = this.editing && this.editId ? this.svc.update(this.editId, this.model) : this.svc.create(this.model);
    obs.subscribe({
      next: () => { this.saving.set(false); this.showForm.set(false); this.load(); this.toast.success(this.editing ? 'User updated.' : 'User created.'); },
      error: e => { this.error.set(e?.error?.title ?? 'Save failed.'); this.saving.set(false); }
    });
  }

  confirmPurge(u: User) { this.purgeTarget.set(u); }

  purge() {
    const u = this.purgeTarget();
    if (!u) return;
    this.purging.set(true);
    this.svc.hardDelete(u.id).subscribe({
      next: () => { this.purging.set(false); this.purgeTarget.set(null); this.load(); this.toast.success(`${u.fullName} deleted permanently.`); },
      error: e => { this.purging.set(false); this.toast.error(e?.error?.title ?? 'Delete failed.'); }
    });
  }

  resetPw(u: User) {
    const pw = prompt(`New password for ${u.fullName} (min 6 chars):`);
    if (!pw) return;
    this.svc.resetPassword(u.id, pw).subscribe({
      next: () => this.toast.success('Password reset.'),
      error: e => this.toast.error(e?.error?.title ?? 'Failed.')
    });
  }

  xlDownload() { this.xlSvc.downloadExport('users'); }

  xlImport(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.importing.set(true);
    this.importResult.set(null);
    this.xlSvc.import('users', file).subscribe({
      next: r => { this.importing.set(false); this.importResult.set(r); if (r.imported > 0 || r.updated > 0) this.load(); },
      error: e => { this.importing.set(false); this.toast.error(e?.error?.title ?? 'Import failed.'); }
    });
    (event.target as HTMLInputElement).value = '';
  }
}
