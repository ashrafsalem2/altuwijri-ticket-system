import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TaskQuery, TaskService } from '../../core/services/task.service';
import { ProjectService, UserService, OrganizationService } from '../../core/services/data.services';
import { Branch } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
import { TaskForm } from './task-form';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { TicketLifetime } from '../../shared/ticket-lifetime';
import {
  PRIORITIES, PagedResult, Project, STATUS_LABELS, TASK_STATUSES, TASK_TYPES, TYPE_LABELS,
  TaskListItem, User, WorkTaskStatus, TaskType
} from '../../core/models/models';
import { initials, typeIcon } from '../../shared/util';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-task-list',
  imports: [RouterLink, FormsModule, TaskForm, TranslatePipe, TicketLifetime],
  styleUrl: './task-list.scss',
  template: `
  <div class="page" [attr.dir]="i18n.dir()">
    <div class="page-header">
      <h2>{{ 'nav.tasks' | t }}</h2>
      @if (canEdit()) { <button class="btn btn-primary" (click)="showForm.set(true)">+ {{ 'task.new' | t }}</button> }
    </div>

    <div class="card card-pad filters">
      <input class="input" placeholder="{{ 'task.search' | t }}" [(ngModel)]="q.search" (keyup.enter)="apply()" />
      <select [(ngModel)]="q.status" (ngModelChange)="apply()">
        <option [ngValue]="undefined">{{ 'task.allStatuses' | t }}</option>
        @for (s of statuses; track s) { <option [ngValue]="s">{{ 'st.' + s | t }}</option> }
      </select>
      <select [(ngModel)]="q.priority" (ngModelChange)="apply()">
        <option [ngValue]="undefined">{{ 'task.allPriorities' | t }}</option>
        @for (p of priorities; track p) { <option [ngValue]="p">{{ 'pr.' + p | t }}</option> }
      </select>
      <select [(ngModel)]="q.type" (ngModelChange)="apply()">
        <option [ngValue]="undefined">{{ 'task.allTypes' | t }}</option>
        @for (t of types; track t) { <option [ngValue]="t">{{ icon(t) }} {{ 'ty.' + t | t }}</option> }
      </select>
      <select [(ngModel)]="q.projectId" (ngModelChange)="apply()">
        <option [ngValue]="undefined">{{ 'task.allProjects' | t }}</option>
        @for (p of projects(); track p.id) { <option [ngValue]="p.id">{{ p.name }}</option> }
      </select>
      <select [(ngModel)]="q.branchId" (ngModelChange)="apply()">
        <option [ngValue]="undefined">{{ 'task.allBranches' | t }}</option>
        @for (b of branches(); track b.id) { <option [ngValue]="b.id">{{ b.name }}</option> }
      </select>
      @if (!isTechnician()) {
        <select [(ngModel)]="q.assigneeId" (ngModelChange)="apply()">
          <option [ngValue]="undefined">{{ 'task.anyone' | t }}</option>
          @for (u of users(); track u.id) { <option [ngValue]="u.id">{{ u.fullName }}</option> }
        </select>
      }
    </div>

    <div class="card mt-2">
      @if (loading()) { <div class="spin"></div> } @else {
        <div class="table-wrap">
        <table class="table">
          <thead><tr>
            <th (click)="sort('title')">{{ 'task.title' | t }}</th>
            <th>{{ 'task.project' | t }}</th>
            <th>{{ 'task.status' | t }}</th>
            <th>{{ 'task.priority' | t }}</th>
            <th>{{ 'task.type' | t }}</th>
            <th>{{ 'task.assignee' | t }}</th>
            <th>{{ 'task.elapsed' | t }}</th>
          </tr></thead>
          <tbody>
            @for (t of page()?.items; track t.id) {
              <tr>
                <td><a [routerLink]="['/tasks', t.id]" class="t-title" dir="auto">{{ t.title }}</a></td>
                <td><span class="proj-dot" [style.background]="t.projectColor"></span> {{ t.projectName }}</td>
                <td>
                  <span class="flex items-center gap-1">
                    <span class="badge" [class]="'st-' + t.status">{{ 'st.' + t.status | t }}</span>
                    @if (t.status === 'InReview' && canClose()) {
                      <button class="btn btn-sm btn-primary" title="{{ 'task.approveDone' | t }}"
                        [disabled]="approving() === t.id" (click)="approveDone(t)">✓ {{ 'st.Done' | t }}</button>
                    }
                  </span>
                </td>
                <td><span class="badge" [class]="'prio-' + t.priority">{{ 'pr.' + t.priority | t }}</span></td>
                <td class="text-sm"><span class="type-em">{{ icon(t.type) }}</span> {{ 'ty.' + t.type | t }}</td>
                <td>
                  @if (t.assigneeName) {
                    <span class="flex items-center gap-1"><span class="avatar sm" [style.background]="t.assigneeColor || '#64748b'">{{ ini(t.assigneeName) }}</span> <span class="text-sm">{{ t.assigneeName }}</span></span>
                  } @else { <span class="muted text-sm">{{ 'task.unassigned' | t }}</span> }
                </td>
                <td>
                  <app-ticket-lifetime [startDate]="t.startDate" [status]="t.status" [completedAt]="undefined" [showEmpty]="false"></app-ticket-lifetime>
                </td>
              </tr>
            } @empty { <tr><td colspan="7"><div class="empty">{{ 'task.noMatch' | t }}</div></td></tr> }
          </tbody>
        </table>
        </div>

        @if (page() && page()!.totalPages > 1) {
          <div class="pager">
            <button class="btn btn-sm btn-ghost" [disabled]="!page()!.hasPrevious" (click)="go(page()!.page - 1)">{{ 'c.prev' | t }}</button>
            <span class="text-sm muted">{{ 'c.page' | t }} {{ page()!.page }} / {{ page()!.totalPages }} · {{ page()!.totalCount }} {{ 'task.tasks' | t }}</span>
            <button class="btn btn-sm btn-ghost" [disabled]="!page()!.hasNext" (click)="go(page()!.page + 1)">{{ 'c.next' | t }}</button>
          </div>
        }
      }
    </div>
  </div>

  @if (showForm()) { <app-task-form (saved)="onSaved()" (cancel)="showForm.set(false)"></app-task-form> }
  `
})
export class TaskList implements OnInit, OnDestroy {
  private taskSvc = inject(TaskService);
  private projectSvc = inject(ProjectService);
  private userSvc = inject(UserService);
  private orgSvc = inject(OrganizationService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  i18n = inject(I18nService);
  toast = inject(ToastService);

  page = signal<PagedResult<TaskListItem> | null>(null);
  projects = signal<Project[]>([]);
  users = signal<User[]>([]);
  branches = signal<Branch[]>([]);
  loading = signal(true);
  showForm = signal(false);

  statuses = TASK_STATUSES; priorities = PRIORITIES; types = TASK_TYPES;
  q: TaskQuery = { page: 1, pageSize: 15, sortBy: 'createdAt', sortDescending: true };

  ini = initials;
  icon = (t: TaskType) => typeIcon(t);
  label = (s: WorkTaskStatus) => STATUS_LABELS[s];
  typeLabel = (t: TaskType) => TYPE_LABELS[t];
  canEdit = () => this.auth.hasRole('Admin', 'Technician');
  canClose = () => this.auth.hasRole('Admin');
  isTechnician = () => this.auth.user()?.role === 'Technician';
  approving = signal<number | null>(null);

  private listPoll?: any;
  ngOnDestroy() { clearInterval(this.listPoll); }

  ngOnInit() {
    // Pre-populate filters from query params (dashboard clickthrough)
    const params = this.route.snapshot.queryParams;
    if (params['status']) this.q.status = params['status'] as WorkTaskStatus;
    if (params['statuses']) {
      const raw = params['statuses'];
      this.q.statuses = (Array.isArray(raw) ? raw : [raw]) as WorkTaskStatus[];
    }
    if (params['priority']) this.q.priority = params['priority'];
    if (params['type']) this.q.type = params['type'];
    if (params['assigneeId']) this.q.assigneeId = Number(params['assigneeId']);
    this.projectSvc.getAll().subscribe(p => this.projects.set(p));
    this.userSvc.getAll().subscribe(u => this.users.set(u));
    this.orgSvc.getBranches().subscribe(b => this.branches.set(b));
    this.load();
    this.listPoll = setInterval(() => this.silentRefresh(), 20000);
  }

  load() {
    this.loading.set(true);
    this.taskSvc.query(this.q).subscribe({
      next: r => { this.page.set(r); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  private silentRefresh() {
    this.taskSvc.query(this.q).subscribe({
      next: r => this.page.set(r)
    });
  }

  apply() { this.q.page = 1; this.load(); }
  go(p: number) { this.q.page = p; this.load(); }
  sort(by: string) {
    this.q.sortDescending = this.q.sortBy === by ? !this.q.sortDescending : false;
    this.q.sortBy = by; this.load();
  }
  onSaved() { this.showForm.set(false); this.load(); }

  approveDone(t: TaskListItem) {
    if (!confirm(`Mark "${t.title}" as Done?`)) return;
    this.approving.set(t.id);
    this.taskSvc.setStatus(t.id, 'Done').subscribe({
      next: () => { this.approving.set(null); this.toast.success(`"${t.title}" marked Done.`); this.load(); },
      error: e => { this.approving.set(null); this.toast.error(e?.error?.title ?? 'Could not update status.'); }
    });
  }
}
