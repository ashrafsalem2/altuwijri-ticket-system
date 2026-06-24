import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrganizationService } from '../../core/services/data.services';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { Area, Branch } from '../../core/models/models';

@Component({
  selector: 'app-organization',
  imports: [FormsModule, TranslatePipe],
  styleUrl: './organization.scss',
  template: `
  <div class="page" [attr.dir]="i18n.dir()">
    <div class="page-header"><h2>{{ 'org.title' | t }}</h2></div>

    <div class="org-grid">
      <!-- Areas -->
      <div class="card">
        <div class="card-pad flex justify-between items-center sec-head">
          <h3>{{ 'org.areas' | t }}</h3>
          @if (canEdit()) { <button class="btn btn-sm btn-primary" (click)="newArea()">+ {{ 'org.areas' | t }}</button> }
        </div>
        <table class="table">
          <thead><tr><th>{{ 'org.name' | t }}</th><th>{{ 'org.code' | t }}</th><th>{{ 'org.branches' | t }}</th>@if (canEdit()){<th></th>}</tr></thead>
          <tbody>
            @for (a of areas(); track a.id) {
              <tr>
                <td><strong>{{ a.name }}</strong><br><span class="text-xs muted">{{ a.description }}</span></td>
                <td>{{ a.code }}</td>
                <td>{{ a.branchCount }}</td>
                @if (canEdit()) {
                  <td><div class="flex gap-1">
                    <button class="btn btn-sm btn-ghost" (click)="editArea(a)">{{ 'c.edit' | t }}</button>
                    @if (isAdmin()) { <button class="btn btn-sm btn-danger" (click)="delArea(a)">{{ 'c.delete' | t }}</button> }
                  </div></td>
                }
              </tr>
            } @empty { <tr><td colspan="4"><div class="empty">{{ 'org.noAreas' | t }}</div></td></tr> }
          </tbody>
        </table>
      </div>

      <!-- Branches -->
      <div class="card">
        <div class="card-pad flex justify-between items-center sec-head">
          <h3>{{ 'org.branches' | t }}</h3>
          @if (canEdit()) { <button class="btn btn-sm btn-primary" (click)="newBranch()">+ {{ 'org.branch' | t }}</button> }
        </div>
        <table class="table">
          <thead><tr><th>{{ 'org.name' | t }}</th><th>{{ 'org.code' | t }}</th><th>{{ 'org.area' | t }}</th><th>{{ 'org.users' | t }}</th>@if (canEdit()){<th></th>}</tr></thead>
          <tbody>
            @for (b of branches(); track b.id) {
              <tr>
                <td><strong>{{ b.name }}</strong><br><span class="text-xs muted">{{ b.address }}</span></td>
                <td>{{ b.code }}</td>
                <td>{{ b.areaName }}</td>
                <td>{{ b.userCount }}</td>
                @if (canEdit()) {
                  <td><div class="flex gap-1">
                    <button class="btn btn-sm btn-ghost" (click)="editBranch(b)">{{ 'c.edit' | t }}</button>
                    @if (isAdmin()) { <button class="btn btn-sm btn-danger" (click)="delBranch(b)">{{ 'c.delete' | t }}</button> }
                  </div></td>
                }
              </tr>
            } @empty { <tr><td colspan="5"><div class="empty">{{ 'org.noBranches' | t }}</div></td></tr> }
          </tbody>
        </table>
      </div>
    </div>
  </div>

  @if (areaForm()) {
    <div class="overlay" (click)="areaForm.set(false)">
      <div class="modal card" (click)="$event.stopPropagation()">
        <div class="modal-head"><h3>{{ editing ? ('org.editArea' | t) : ('org.newArea' | t) }}</h3><button class="btn btn-icon btn-ghost" (click)="areaForm.set(false)">✕</button></div>
        <div class="modal-body">
          <div class="form-row">
            <div class="field"><label>{{ 'org.name' | t }} *</label><input class="input" [(ngModel)]="am.name" /></div>
            <div class="field"><label>{{ 'org.code' | t }} *</label><input class="input" [(ngModel)]="am.code" [disabled]="editing" /></div>
          </div>
          <div class="field"><label>{{ 'org.desc' | t }}</label><textarea [(ngModel)]="am.description"></textarea></div>
          @if (error()) { <div class="err">{{ error() }}</div> }
        </div>
        <div class="modal-foot"><button class="btn btn-ghost" (click)="areaForm.set(false)">{{ 'c.cancel' | t }}</button><button class="btn btn-primary" (click)="saveArea()">{{ 'c.save' | t }}</button></div>
      </div>
    </div>
  }

  @if (branchForm()) {
    <div class="overlay" (click)="branchForm.set(false)">
      <div class="modal card" (click)="$event.stopPropagation()">
        <div class="modal-head"><h3>{{ editing ? ('org.editBranch' | t) : ('org.newBranch' | t) }}</h3><button class="btn btn-icon btn-ghost" (click)="branchForm.set(false)">✕</button></div>
        <div class="modal-body">
          <div class="form-row">
            <div class="field"><label>{{ 'org.name' | t }} *</label><input class="input" [(ngModel)]="bm.name" /></div>
            <div class="field"><label>{{ 'org.code' | t }} *</label><input class="input" [(ngModel)]="bm.code" [disabled]="editing" /></div>
          </div>
          <div class="field"><label>{{ 'org.area' | t }} *</label>
            <select [(ngModel)]="bm.areaId">@for (a of areas(); track a.id) { <option [ngValue]="a.id">{{ a.name }}</option> }</select>
          </div>
          <div class="form-row">
            <div class="field"><label>{{ 'org.address' | t }}</label><input class="input" [(ngModel)]="bm.address" /></div>
            <div class="field"><label>{{ 'org.phone' | t }}</label><input class="input" [(ngModel)]="bm.phone" /></div>
          </div>
          @if (error()) { <div class="err">{{ error() }}</div> }
        </div>
        <div class="modal-foot"><button class="btn btn-ghost" (click)="branchForm.set(false)">{{ 'c.cancel' | t }}</button><button class="btn btn-primary" (click)="saveBranch()">{{ 'c.save' | t }}</button></div>
      </div>
    </div>
  }
  `
})
export class Organization implements OnInit {
  private org = inject(OrganizationService);
  private auth = inject(AuthService);
  i18n = inject(I18nService);

  areas = signal<Area[]>([]);
  branches = signal<Branch[]>([]);
  areaForm = signal(false);
  branchForm = signal(false);
  editing = false;
  editId?: number;
  error = signal('');
  am: any = {};
  bm: any = {};

  canEdit = () => this.auth.hasRole('Admin', 'Manager');
  isAdmin = () => this.auth.hasRole('Admin');

  ngOnInit() { this.load(); }
  load() {
    this.org.getAreas().subscribe(a => this.areas.set(a));
    this.org.getBranches().subscribe(b => this.branches.set(b));
  }

  newArea() { this.editing = false; this.error.set(''); this.am = { name: '', code: '', description: '' }; this.areaForm.set(true); }
  editArea(a: Area) { this.editing = true; this.editId = a.id; this.error.set(''); this.am = { ...a }; this.areaForm.set(true); }
  saveArea() {
    if (!this.am.name?.trim() || (!this.editing && !this.am.code?.trim())) { this.error.set('Name and code required.'); return; }
    const obs = this.editing && this.editId ? this.org.updateArea(this.editId, this.am) : this.org.createArea(this.am);
    obs.subscribe({ next: () => { this.areaForm.set(false); this.load(); }, error: e => this.error.set(e?.error?.title ?? 'Failed.') });
  }
  delArea(a: Area) { if (confirm(`Delete area "${a.name}"?`)) this.org.deleteArea(a.id).subscribe({ next: () => this.load(), error: e => alert(e?.error?.title ?? 'Failed.') }); }

  newBranch() { this.editing = false; this.error.set(''); this.bm = { name: '', code: '', areaId: this.areas()[0]?.id, address: '', phone: '' }; this.branchForm.set(true); }
  editBranch(b: Branch) { this.editing = true; this.editId = b.id; this.error.set(''); this.bm = { ...b }; this.branchForm.set(true); }
  saveBranch() {
    if (!this.bm.name?.trim() || (!this.editing && !this.bm.code?.trim()) || !this.bm.areaId) { this.error.set('Name, code and area required.'); return; }
    const obs = this.editing && this.editId ? this.org.updateBranch(this.editId, this.bm) : this.org.createBranch(this.bm);
    obs.subscribe({ next: () => { this.branchForm.set(false); this.load(); }, error: e => this.error.set(e?.error?.title ?? 'Failed.') });
  }
  delBranch(b: Branch) { if (confirm(`Delete branch "${b.name}"?`)) this.org.deleteBranch(b.id).subscribe({ next: () => this.load(), error: e => alert(e?.error?.title ?? 'Failed.') }); }
}
