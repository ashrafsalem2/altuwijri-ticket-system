import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../core/services/task.service';
import { ProjectService, TagService, UserService, OrganizationService, TicketCategoryService } from '../../core/services/data.services';
import { AuthService } from '../../core/services/auth.service';
import { Branch, TicketCategory } from '../../core/models/models';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { TagPicker } from '../../shared/tag-picker';
import { TagManager } from '../../shared/tag-manager';
import {
  CreateTaskRequest, PRIORITIES, Project, Tag, TASK_STATUSES, TASK_TYPES, TaskDetail,
  TaskPriority, TaskType, TYPE_LABELS, STATUS_LABELS, User, WorkTaskStatus, UpdateTaskRequest
} from '../../core/models/models';
import { TYPE_ICONS } from '../../shared/util';

@Component({
  selector: 'app-task-form',
  imports: [FormsModule, TranslatePipe, TagPicker, TagManager],
  styleUrl: './task-form.scss',
  template: `
  <div class="overlay" (click)="onOverlayClick($event)">
    <div class="modal card">
      <div class="modal-head">
        <h3>{{ task ? ('task.edit' | t) : ('task.new' | t) }}</h3>
        <button class="btn btn-icon btn-ghost" (click)="cancel.emit()">✕</button>
      </div>

      <div class="modal-body">
        <div class="field">
          <label>{{ 'task.title' | t }} *</label>
          <input class="input" [(ngModel)]="model.title" placeholder="{{ 'task.titlePlaceholder' | t }}" />
        </div>
        <div class="field">
          <label>{{ 'task.description' | t }}</label>
          <textarea [(ngModel)]="model.description"></textarea>
        </div>

        <div class="form-row">
          <div class="field"><label>{{ 'task.project' | t }} *</label>
            <select [(ngModel)]="model.projectId">
              @for (p of projects(); track p.id) { <option [value]="p.id">{{ p.name }}</option> }
            </select>
          </div>
          <div class="field"><label>{{ 'org.branch' | t }}</label>
            <select [(ngModel)]="model.branchId">
              <option [ngValue]="null">— {{ 'c.none' | t }} —</option>
              @for (b of branches(); track b.id) { <option [ngValue]="b.id">{{ b.name }} ({{ b.areaName }})</option> }
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="field"><label>{{ 'task.category' | t }}</label>
            <select [(ngModel)]="model.categoryId">
              <option [ngValue]="null">— {{ 'c.none' | t }} —</option>
              @for (c of categories(); track c.id) { <option [ngValue]="c.id">{{ c.icon }} {{ c.name }}</option> }
            </select>
          </div>
          <div class="field"><label>{{ 'task.assignee' | t }}</label>
            <select [(ngModel)]="model.assigneeId">
              <option [ngValue]="null">— {{ 'task.unassigned' | t }} —</option>
              @for (u of users(); track u.id) { <option [ngValue]="u.id">{{ u.fullName }}</option> }
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="field"><label>{{ 'task.type' | t }}</label>
            <select [(ngModel)]="model.type">
              @for (t of types; track t) { <option [value]="t">{{ typeIcon(t) }} {{ typeLabel(t) }}</option> }
            </select>
          </div>
          <div class="field"><label>{{ 'task.priority' | t }}</label>
            <select [(ngModel)]="model.priority">
              @for (p of priorities; track p) { <option [value]="p">{{ p }}</option> }
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="field"><label>{{ 'task.status' | t }}</label>
            <select [(ngModel)]="model.status">
              @for (s of statuses; track s) { <option [value]="s">{{ statusLabel(s) }}</option> }
            </select>
          </div>
          <div class="field"></div>
        </div>

        @if (editing) {
          <div class="form-row">
            <div class="field"><label>{{ 'task.progress' | t }} %</label>
              <input class="input" type="number" min="0" max="100" [(ngModel)]="progress" />
            </div>
          </div>
        }

        <div class="field">
          <div class="tags-header">
            <label>{{ 'task.tags' | t }}</label>
            @if (canManageTags()) {
              <button type="button" class="btn btn-ghost btn-sm" (click)="showTagManager.set(true)">⚙ {{ 'tag.manage' | t }}</button>
            }
          </div>
          <app-tag-picker
            [allTags]="tags()"
            [selectedTagIds]="getSelectedIds()"
            (selectionChange)="onTagsChange($event)"
            (tagsRefresh)="reloadTags()">
          </app-tag-picker>
        </div>

        @if (error()) { <div class="err">{{ error() }}</div> }
      </div>

      <div class="modal-foot">
        <button class="btn btn-ghost" (click)="cancel.emit()">{{ 'c.cancel' | t }}</button>
        <button class="btn btn-primary" (click)="save()" [disabled]="saving()">{{ saving() ? ('c.saving' | t) : ('c.save' | t) }}</button>
      </div>
    </div>
  </div>

  @if (showTagManager()) {
    <app-tag-manager (close)="showTagManager.set(false)" (changed)="reloadTags()"></app-tag-manager>
  }
  `
})
export class TaskForm implements OnInit {
  @Input() task?: TaskDetail;
  @Input() defaultStatus?: WorkTaskStatus;
  @Input() defaultProjectId?: number;
  @Output() saved = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  private taskSvc = inject(TaskService);
  private projectSvc = inject(ProjectService);
  private userSvc = inject(UserService);
  private tagSvc = inject(TagService);
  private orgSvc = inject(OrganizationService);
  private catSvc = inject(TicketCategoryService);
  private auth = inject(AuthService);

  projects = signal<Project[]>([]);
  users = signal<User[]>([]);
  tags = signal<Tag[]>([]);
  branches = signal<Branch[]>([]);
  categories = signal<TicketCategory[]>([]);
  saving = signal(false);
  error = signal('');
  showTagManager = signal(false);
  canManageTags = () => this.auth.hasRole('Admin');

  statuses = TASK_STATUSES; priorities = PRIORITIES; types = TASK_TYPES;
  selectedTagIds: number[] = [];
  editing = false;
  progress = 0;

  model: CreateTaskRequest = {
    title: '', description: '', status: 'Backlog', priority: 'Medium', type: 'Task',
    projectId: 0, branchId: null, categoryId: null, assigneeId: null
  };

  statusLabel = (s: WorkTaskStatus) => STATUS_LABELS[s];
  typeLabel = (t: TaskType) => TYPE_LABELS[t];
  typeIcon = (t: TaskType) => TYPE_ICONS[t] ?? '📋';

  ngOnInit() {
    this.projectSvc.getAll().subscribe(p => {
      this.projects.set(p);
      if (!this.task && p.length) this.model.projectId = this.defaultProjectId ?? p[0].id;
    });
    this.userSvc.getAll().subscribe(u => this.users.set(u));
    this.tagSvc.getAll().subscribe(t => this.tags.set(t));
    this.orgSvc.getBranches().subscribe(b => this.branches.set(b));
    this.catSvc.getAll().subscribe(c => this.categories.set(c));

    if (this.task) {
      this.editing = true;
      const t = this.task;
      this.model = {
        title: t.title, description: t.description, status: t.status, priority: t.priority, type: t.type,
        projectId: t.projectId, branchId: t.branchId ?? null, categoryId: t.categoryId ?? null, assigneeId: t.assigneeId ?? null
      };
      this.progress = t.progress;
      this.selectedTagIds = t.tags.map(tag => tag.id);
    } else if (this.defaultStatus) {
      this.model.status = this.defaultStatus;
    }
  }

  onOverlayClick(e: MouseEvent) { if (e.target === e.currentTarget) this.cancel.emit(); }

  getSelectedIds() { return this.selectedTagIds; }
  onTagsChange(ids: number[]) { this.selectedTagIds = ids; }
  reloadTags() { this.tagSvc.getAll().subscribe(t => this.tags.set(t)); }

  save() {
    if (!this.model.title?.trim()) { this.error.set('Title is required.'); return; }
    if (!this.model.projectId) { this.error.set('Project is required.'); return; }
    this.saving.set(true);
    this.error.set('');

    const obs = this.editing && this.task
      ? this.taskSvc.update(this.task.id, { ...this.model, progress: Number(this.progress), tagIds: this.selectedTagIds } as UpdateTaskRequest)
      : this.taskSvc.create({ ...this.model, tagIds: this.selectedTagIds } as CreateTaskRequest);

    obs.subscribe({
      next: () => { this.saving.set(false); this.saved.emit(); },
      error: (e) => { this.error.set(e?.error?.title ?? 'Save failed.'); this.saving.set(false); }
    });
  }
}
