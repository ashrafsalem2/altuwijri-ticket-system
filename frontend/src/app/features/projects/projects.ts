import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectService, UserService } from '../../core/services/data.services';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { PROJECT_STATUSES, Project, ProjectStatus, User } from '../../core/models/models';

@Component({
  selector: 'app-projects',
  imports: [FormsModule, TranslatePipe],
  styleUrl: './projects.scss',
  template: `
  <div class="page" [attr.dir]="i18n.dir()">
    <div class="page-header">
      <h2>{{ 'proj.title' | t }}</h2>
      @if (canEdit()) { <button class="btn btn-primary" (click)="openNew()">+ {{ 'proj.new' | t }}</button> }
    </div>

    @if (loading()) { <div class="spin"></div> } @else {
      <div class="grid proj-grid">
        @for (p of projects(); track p.id) {
          <div class="card card-pad proj-card" [style.borderTopColor]="p.color">
            <div class="flex justify-between items-center">
              <span class="code">{{ p.code }}</span>
              <span class="badge st-{{ p.status === 'Active' ? 'Done' : 'Backlog' }}">{{ p.status }}</span>
            </div>
            <h3>{{ p.name }}</h3>
            <p class="muted text-sm desc">{{ p.description || ('c.noDesc' | t) }}</p>
            <div class="progress"><div class="progress-fill"
              [style.width.%]="p.taskCount ? (p.completedTaskCount / p.taskCount * 100) : 0"></div></div>
            <div class="flex justify-between text-xs muted mt-1">
              <span>{{ p.completedTaskCount }}/{{ p.taskCount }} {{ 'proj.done' | t }}</span>
              <span>{{ p.leadName || ('proj.noLead' | t) }}</span>
            </div>
            @if (canEdit()) {
              <div class="flex gap-1 mt-1">
                <button class="btn btn-sm btn-ghost" (click)="openEdit(p)">{{ 'c.edit' | t }}</button>
                @if (isAdmin()) { <button class="btn btn-sm btn-danger" (click)="remove(p)">{{ 'c.delete' | t }}</button> }
              </div>
            }
          </div>
        } @empty { <div class="empty">{{ 'c.empty' | t }}</div> }
      </div>
    }
  </div>

  @if (showForm()) {
    <div class="overlay" (click)="showForm.set(false)">
      <div class="modal card" (click)="$event.stopPropagation()">
        <div class="modal-head"><h3>{{ editing ? ('proj.edit' | t) : ('proj.new' | t) }}</h3>
          <button class="btn btn-icon btn-ghost" (click)="showForm.set(false)">✕</button></div>
        <div class="modal-body">
          <div class="form-row">
            <div class="field"><label>{{ 'proj.name' | t }} *</label><input class="input" [(ngModel)]="model.name" /></div>
            <div class="field"><label>{{ 'proj.code' | t }} *</label><input class="input" [(ngModel)]="model.code" [disabled]="editing" /></div>
          </div>
          <div class="field"><label>{{ 'task.description' | t }}</label><textarea [(ngModel)]="model.description"></textarea></div>
          <div class="form-row">
            <div class="field"><label>{{ 'proj.status' | t }}</label>
              <select [(ngModel)]="model.status">@for (s of statuses; track s) { <option [value]="s">{{ s }}</option> }</select>
            </div>
            <div class="field"><label>{{ 'proj.lead' | t }}</label>
              <select [(ngModel)]="model.leadId">
                <option [ngValue]="null">— {{ 'c.none' | t }} —</option>
                @for (u of users(); track u.id) { <option [ngValue]="u.id">{{ u.fullName }}</option> }
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="field"><label>{{ 'task.startDate' | t }}</label><input class="input" type="date" [(ngModel)]="model.startDate" /></div>
            <div class="field"><label>{{ 'proj.endDate' | t }}</label><input class="input" type="date" [(ngModel)]="model.endDate" /></div>
          </div>
          <div class="field"><label>{{ 'proj.colour' | t }}</label><input type="color" [(ngModel)]="model.color" /></div>
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
export class Projects implements OnInit {
  private svc = inject(ProjectService);
  private userSvc = inject(UserService);
  private auth = inject(AuthService);
  i18n = inject(I18nService);

  projects = signal<Project[]>([]);
  users = signal<User[]>([]);
  loading = signal(true);
  showForm = signal(false);
  saving = signal(false);
  error = signal('');
  editing = false;
  editId?: number;
  statuses = PROJECT_STATUSES;
  model: any = {};

  canEdit = () => this.auth.hasRole('Admin', 'Manager');
  isAdmin = () => this.auth.hasRole('Admin');

  ngOnInit() { this.userSvc.getAll().subscribe(u => this.users.set(u)); this.load(); }

  load() { this.loading.set(true); this.svc.getAll().subscribe(p => { this.projects.set(p); this.loading.set(false); }); }

  openNew() {
    this.editing = false; this.error.set('');
    this.model = { name: '', code: '', description: '', status: 'Active' as ProjectStatus, color: '#3b82f6', leadId: null };
    this.showForm.set(true);
  }
  openEdit(p: Project) {
    this.editing = true; this.editId = p.id; this.error.set('');
    this.model = { ...p, startDate: p.startDate?.substring(0, 10), endDate: p.endDate?.substring(0, 10), leadId: p.leadId ?? null };
    this.showForm.set(true);
  }

  save() {
    if (!this.model.name?.trim() || (!this.editing && !this.model.code?.trim())) { this.error.set('Name and code are required.'); return; }
    this.saving.set(true); this.error.set('');
    const obs = this.editing && this.editId
      ? this.svc.update(this.editId, this.model)
      : this.svc.create(this.model);
    obs.subscribe({
      next: () => { this.saving.set(false); this.showForm.set(false); this.load(); },
      error: e => { this.error.set(e?.error?.title ?? 'Save failed.'); this.saving.set(false); }
    });
  }

  remove(p: Project) {
    if (!confirm(`Delete project "${p.name}"?`)) return;
    this.svc.delete(p.id).subscribe({ next: () => this.load(), error: e => alert(e?.error?.title ?? 'Delete failed.') });
  }
}
