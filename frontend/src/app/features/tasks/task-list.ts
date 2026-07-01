import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
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
  PRIORITIES, PagedResult, Project, TASK_STATUSES, TASK_TYPES,
  TaskListItem, User, WorkTaskStatus, TaskType
} from '../../core/models/models';
import { initials, typeIcon } from '../../shared/util';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { CelebrationOverlay } from '../../shared/celebration-overlay';
import { ColFilter, FilterOption } from '../../shared/col-filter/col-filter';

@Component({
  selector: 'app-task-list',
  imports: [RouterLink, FormsModule, TaskForm, TranslatePipe, TicketLifetime, CelebrationOverlay, ColFilter],
  styleUrl: './task-list.scss',
  template: `
  <div class="page" [attr.dir]="i18n.dir()">
    <div class="page-header">
      <h2>{{ 'nav.tasks' | t }}</h2>
      @if (canEdit()) { <button class="btn btn-primary" (click)="showForm.set(true)">+ {{ 'task.new' | t }}</button> }
    </div>

    @if (hasActiveFilters()) {
      <div class="active-filters no-print">
        <span class="text-sm muted">{{ 'task.filtersActive' | t }}</span>
        <button class="btn btn-sm btn-ghost" (click)="clearFilters()">✕ {{ 'task.clearFilters' | t }}</button>
      </div>
    }

    <div class="card mt-2">
      @if (loading()) { <div class="spin"></div> } @else {
        <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th (click)="sort('title')">{{ 'task.title' | t }}</th>
              <th>{{ 'task.project' | t }}</th>
              <th>{{ 'org.branch' | t }}</th>
              <th>{{ 'task.status' | t }}</th>
              <th>{{ 'task.priority' | t }}</th>
              <th>{{ 'task.type' | t }}</th>
              <th>{{ 'task.assignee' | t }}</th>
              <th>{{ 'task.elapsed' | t }}</th>
            </tr>
            <tr class="filter-row no-print">
              <th>
                <input class="col-filter-input" placeholder="{{ 'task.search' | t }}"
                  [(ngModel)]="q.search" (ngModelChange)="applyDebounced()" />
              </th>
              <th>
                <app-col-filter
                  [options]="projectOpts()"
                  [value]="q.projectId ?? null"
                  (valueChange)="q.projectId = $event ?? undefined; apply()"
                  [placeholder]="i18n.t('task.allProjects')" />
              </th>
              <th>
                <app-col-filter
                  [options]="branchOpts()"
                  [value]="q.branchId ?? null"
                  (valueChange)="q.branchId = $event ?? undefined; apply()"
                  [placeholder]="i18n.t('task.allBranches')" />
              </th>
              <th>
                <app-col-filter
                  [options]="statusOpts()"
                  [multi]="true"
                  [values]="statusValues()"
                  (valuesChange)="statusValues.set($event); apply()"
                  [placeholder]="i18n.t('task.allStatuses')" />
              </th>
              <th>
                <app-col-filter
                  [options]="priorityOpts()"
                  [value]="q.priority ?? null"
                  (valueChange)="q.priority = $event ?? undefined; apply()"
                  [placeholder]="i18n.t('task.allPriorities')" />
              </th>
              <th>
                <app-col-filter
                  [options]="typeOpts()"
                  [value]="q.type ?? null"
                  (valueChange)="q.type = $event ?? undefined; apply()"
                  [placeholder]="i18n.t('task.allTypes')" />
              </th>
              <th>
                @if (!isTechnician()) {
                  <app-col-filter
                    [options]="userOpts()"
                    [value]="q.assigneeId ?? null"
                    (valueChange)="q.assigneeId = $event ?? undefined; apply()"
                    [placeholder]="i18n.t('task.anyone')"
                    [alignEnd]="true" />
                }
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (t of page()?.items; track t.id) {
              <tr>
                <td><a [routerLink]="['/tasks', t.id]" class="t-title" dir="auto">{{ t.title }}</a></td>
                <td><span class="proj-dot" [style.background]="t.projectColor"></span> {{ t.projectName }}</td>
                <td class="text-sm">{{ t.branchName || '—' }}</td>
                <td class="status-cell">
                  <span class="flex items-center gap-1 status-row">
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
            } @empty { <tr><td colspan="8"><div class="empty">{{ 'task.noMatch' | t }}</div></td></tr> }
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

  <app-celebration-overlay [show]="showCelebration()" />
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
  private confirmSvc = inject(ConfirmService);

  page = signal<PagedResult<TaskListItem> | null>(null);
  projects = signal<Project[]>([]);
  users = signal<User[]>([]);
  branches = signal<Branch[]>([]);
  loading = signal(true);
  showForm = signal(false);

  q: TaskQuery = { page: 1, pageSize: 15, sortBy: 'createdAt', sortDescending: true };

  // Multi-select status filter (backend supports q.statuses[])
  statusValues = signal<WorkTaskStatus[]>([]);

  // ── Filter option arrays (reactive to i18n language) ──
  statusOpts = computed<FilterOption[]>(() =>
    TASK_STATUSES.map(s => ({ value: s, label: this.i18n.t('st.' + s) }))
  );
  priorityOpts = computed<FilterOption[]>(() =>
    PRIORITIES.map(p => ({ value: p, label: this.i18n.t('pr.' + p) }))
  );
  typeOpts = computed<FilterOption[]>(() =>
    TASK_TYPES.map(t => ({ value: t, label: `${typeIcon(t as TaskType)}  ${this.i18n.t('ty.' + t)}` }))
  );
  projectOpts = computed<FilterOption[]>(() =>
    this.projects().map(p => ({ value: p.id, label: p.name }))
  );
  branchOpts = computed<FilterOption[]>(() =>
    this.branches().map(b => ({ value: b.id, label: b.name }))
  );
  userOpts = computed<FilterOption[]>(() =>
    this.users().map(u => ({ value: u.id, label: u.fullName }))
  );

  ini = initials;
  icon = (t: TaskType) => typeIcon(t);
  canEdit = () => this.auth.hasRole('Admin', 'Technician');
  canClose = () => this.auth.hasRole('Admin');
  isTechnician = () => this.auth.user()?.role === 'Technician';
  approving = signal<number | null>(null);
  showCelebration = signal(false);

  private listPoll?: any;
  private searchTimer?: any;
  ngOnDestroy() { clearInterval(this.listPoll); clearTimeout(this.searchTimer); }

  ngOnInit() {
    const params = this.route.snapshot.queryParams;
    if (params['status'])   this.statusValues.set([params['status'] as WorkTaskStatus]);
    if (params['statuses']) {
      const raw = params['statuses'];
      this.statusValues.set((Array.isArray(raw) ? raw : [raw]) as WorkTaskStatus[]);
    }
    if (params['priority'])   this.q.priority = params['priority'];
    if (params['type'])       this.q.type = params['type'];
    if (params['assigneeId']) this.q.assigneeId = Number(params['assigneeId']);

    this.projectSvc.getAll().subscribe(p => this.projects.set(p));
    this.userSvc.getAll().subscribe(u => this.users.set(u));
    this.orgSvc.getBranches().subscribe(b => this.branches.set(b));
    this.load();
    this.listPoll = setInterval(() => this.silentRefresh(), 20000);
  }

  load() {
    // Sync statusValues → query object
    this.q.status   = undefined;
    this.q.statuses = this.statusValues().length ? this.statusValues() : undefined;
    this.loading.set(true);
    this.taskSvc.query(this.q).subscribe({
      next: r => { this.page.set(r); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  private silentRefresh() {
    this.q.statuses = this.statusValues().length ? this.statusValues() : undefined;
    this.taskSvc.query(this.q).subscribe({ next: r => this.page.set(r) });
  }

  apply() { this.q.page = 1; this.load(); }

  // Debounce text search so every keystroke doesn't fire an API call
  applyDebounced() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.apply(), 350);
  }

  go(p: number) { this.q.page = p; this.load(); }
  sort(by: string) {
    this.q.sortDescending = this.q.sortBy === by ? !this.q.sortDescending : false;
    this.q.sortBy = by; this.load();
  }
  onSaved() { this.showForm.set(false); this.load(); }

  hasActiveFilters(): boolean {
    return !!(this.q.search || this.statusValues().length || this.q.priority || this.q.type ||
      this.q.projectId || this.q.branchId || this.q.assigneeId);
  }
  clearFilters() {
    this.q.search = undefined; this.q.priority = undefined;
    this.q.type = undefined; this.q.projectId = undefined;
    this.q.branchId = undefined; this.q.assigneeId = undefined;
    this.statusValues.set([]);
    this.apply();
  }

  async approveDone(t: TaskListItem) {
    const ok = await this.confirmSvc.ask({
      title: 'Approve and mark as Done',
      message: 'This ticket will be marked as Done and closed.',
      detail: t.title,
      confirmLabel: 'Done',
      variant: 'success',
      icon: '✓'
    });
    if (!ok) return;
    this.approving.set(t.id);
    this.taskSvc.setStatus(t.id, 'Done').subscribe({
      next: () => {
        this.approving.set(null);
        this.toast.success(`"${t.title}" marked Done.`);
        this.showCelebration.set(true);
        setTimeout(() => this.showCelebration.set(false), 4900);
        this.load();
      },
      error: e => { this.approving.set(null); this.toast.error(e?.error?.title ?? 'Could not update status.'); }
    });
  }
}
