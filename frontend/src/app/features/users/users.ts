import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { UserService, OrganizationService } from '../../core/services/data.services';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { Branch, Role, User } from '../../core/models/models';
import { initials } from '../../shared/util';

@Component({
  selector: 'app-users',
  imports: [FormsModule, DatePipe, TranslatePipe],
  styleUrl: './users.scss',
  template: `
  <div class="page" [attr.dir]="i18n.dir()">
    <div class="page-header">
      <h2>{{ 'usr.title' | t }}</h2>
      <div class="flex gap-1 items-center">
        <label class="chk"><input type="checkbox" [(ngModel)]="includeInactive" (ngModelChange)="load()" /> {{ 'usr.showInactive' | t }}</label>
        @if (isAdmin()) { <button class="btn btn-primary" (click)="openNew()">+ {{ 'usr.newUser' | t }}</button> }
      </div>
    </div>

    <div class="card">
      @if (loading()) { <div class="spin"></div> } @else {
        <table class="table">
          <thead><tr><th>{{ 'usr.name' | t }}</th><th>{{ 'usr.username' | t }}</th><th>{{ 'usr.role' | t }}</th><th>{{ 'usr.branch' | t }}</th><th>{{ 'usr.dept' | t }}</th><th>{{ 'usr.lastLogin' | t }}</th><th>{{ 'task.status' | t }}</th>@if (isAdmin()){<th></th>}</tr></thead>
          <tbody>
            @for (u of users(); track u.id) {
              <tr [class.inactive]="!u.isActive">
                <td><span class="flex items-center gap-1"><span class="avatar sm" [style.background]="u.avatarColor || '#64748b'">{{ ini(u.fullName) }}</span> {{ u.fullName }}</span></td>
                <td class="text-sm">{{ u.userName }}</td>
                <td><span class="badge st-ToDo">{{ u.roleName }}</span></td>
                <td class="text-sm">{{ u.branchName || '—' }}<br><span class="text-xs muted">{{ u.areaName }}</span></td>
                <td class="text-sm">{{ u.department || '—' }}</td>
                <td class="text-sm">{{ u.lastLoginAt ? (u.lastLoginAt | date:'short') : ('c.never' | t) }}</td>
                <td>@if (u.isActive) { <span class="badge st-Done">{{ 'usr.active' | t }}</span> } @else { <span class="badge st-Cancelled">{{ 'usr.inactive' | t }}</span> }</td>
                @if (isAdmin()) {
                  <td><div class="flex gap-1">
                    <button class="btn btn-sm btn-ghost" (click)="openEdit(u)">{{ 'c.edit' | t }}</button>
                    <button class="btn btn-sm btn-ghost" (click)="resetPw(u)">{{ 'usr.resetPw' | t }}</button>
                  </div></td>
                }
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  </div>

  @if (showForm()) {
    <div class="overlay" (click)="showForm.set(false)">
      <div class="modal card" (click)="$event.stopPropagation()">
        <div class="modal-head"><h3>{{ editing ? ('c.edit' | t) : ('usr.newUser' | t) }}</h3>
          <button class="btn btn-icon btn-ghost" (click)="showForm.set(false)">✕</button></div>
        <div class="modal-body">
          <div class="form-row">
            <div class="field"><label>{{ 'usr.name' | t }} *</label><input class="input" [(ngModel)]="model.fullName" /></div>
            <div class="field"><label>{{ 'usr.username' | t }} *</label><input class="input" [(ngModel)]="model.userName" [disabled]="editing" /></div>
          </div>
          <div class="field"><label>{{ 'usr.email' | t }} *</label><input class="input" type="email" [(ngModel)]="model.email" /></div>
          @if (!editing) {
            <div class="field"><label>{{ 'auth.password' | t }} *</label><input class="input" type="password" [(ngModel)]="model.password" /></div>
          }
          <div class="form-row">
            <div class="field"><label>{{ 'usr.role' | t }}</label>
              <select [(ngModel)]="model.roleId">@for (r of roles(); track r.id) { <option [ngValue]="r.id">{{ r.name }}</option> }</select>
            </div>
            <div class="field"><label>{{ 'usr.branch' | t }}</label>
              <select [(ngModel)]="model.branchId">
                <option [ngValue]="null">— {{ 'c.none' | t }} —</option>
                @for (b of branches(); track b.id) { <option [ngValue]="b.id">{{ b.name }} ({{ b.areaName }})</option> }
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="field"><label>{{ 'usr.dept' | t }}</label><input class="input" [(ngModel)]="model.department" /></div>
            <div class="field"><label>{{ 'usr.jobTitle' | t }}</label><input class="input" [(ngModel)]="model.jobTitle" /></div>
          </div>
          <div class="form-row">
            <div class="field"><label>{{ 'usr.phone' | t }}</label><input class="input" [(ngModel)]="model.phoneNumber" /></div>
            <div class="field"></div>
          </div>
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
  `
})
export class Users implements OnInit {
  private svc = inject(UserService);
  private orgSvc = inject(OrganizationService);
  private auth = inject(AuthService);
  i18n = inject(I18nService);

  users = signal<User[]>([]);
  roles = signal<Role[]>([]);
  branches = signal<Branch[]>([]);
  loading = signal(true);
  showForm = signal(false);
  saving = signal(false);
  error = signal('');
  includeInactive = false;
  editing = false;
  editId?: number;
  model: any = {};

  ini = initials;
  isAdmin = () => this.auth.hasRole('Admin');

  ngOnInit() {
    this.svc.roles().subscribe(r => this.roles.set(r));
    this.orgSvc.getBranches().subscribe(b => this.branches.set(b));
    this.load();
  }

  load() { this.loading.set(true); this.svc.getAll(this.includeInactive).subscribe(u => { this.users.set(u); this.loading.set(false); }); }

  openNew() {
    this.editing = false; this.error.set('');
    this.model = { fullName: '', userName: '', email: '', password: '', roleId: this.roles()[0]?.id, isActive: true };
    this.showForm.set(true);
  }
  openEdit(u: User) {
    this.editing = true; this.editId = u.id; this.error.set('');
    this.model = { ...u };
    this.showForm.set(true);
  }

  save() {
    if (!this.model.fullName?.trim() || !this.model.email?.trim()) { this.error.set('Name and email are required.'); return; }
    if (!this.editing && (!this.model.userName?.trim() || !this.model.password)) { this.error.set('Username and password are required.'); return; }
    this.saving.set(true); this.error.set('');
    const obs = this.editing && this.editId ? this.svc.update(this.editId, this.model) : this.svc.create(this.model);
    obs.subscribe({
      next: () => { this.saving.set(false); this.showForm.set(false); this.load(); },
      error: e => { this.error.set(e?.error?.title ?? 'Save failed.'); this.saving.set(false); }
    });
  }

  resetPw(u: User) {
    const pw = prompt(`New password for ${u.fullName} (min 6 chars):`);
    if (!pw) return;
    this.svc.resetPassword(u.id, pw).subscribe({ next: () => alert('Password reset.'), error: e => alert(e?.error?.title ?? 'Failed.') });
  }
}
