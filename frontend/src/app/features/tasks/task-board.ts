import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { TaskService } from '../../core/services/task.service';
import { ProjectService } from '../../core/services/data.services';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { TaskForm } from './task-form';
import {
  BOARD_COLUMNS, PRIORITIES, TASK_TYPES, Project,
  STATUS_LABELS, TaskListItem, WorkTaskStatus
} from '../../core/models/models';
import { initials } from '../../shared/util';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-task-board',
  imports: [DragDropModule, RouterLink, TaskForm, FormsModule, TranslatePipe],
  styleUrl: './task-board.scss',
  template: `
  <div class="page" [attr.dir]="i18n.dir()">
    <div class="page-header">
      <h2>{{ 'board.title' | t }}</h2>
      <div class="flex gap-1 items-center">
        <select [ngModel]="projectFilter" (ngModelChange)="projectFilter = $event; load()">
          <option [ngValue]="undefined">{{ 'board.allProjects' | t }}</option>
          @for (p of projects(); track p.id) { <option [ngValue]="p.id">{{ p.name }}</option> }
        </select>

        <!-- Filter toggle button -->
        <button class="btn btn-ghost brd-filter-btn" (click)="showFilters.set(!showFilters())"
                [class.brd-filter-btn-active]="showFilters() || activeFilters() > 0">
          <span>⚙ {{ 'board.filter' | t }}</span>
          @if (activeFilters() > 0) {
            <span class="brd-filter-badge">{{ activeFilters() }}</span>
          }
        </button>

        @if (canEdit()) { <button class="btn btn-primary" (click)="openNew()">+ {{ 'task.new' | t }}</button> }
      </div>
    </div>

    <!-- Filter bar -->
    @if (showFilters()) {
      <div class="brd-filter-bar">
        <!-- Search -->
        <input class="input brd-search" [placeholder]="'board.searchTickets' | t"
               [ngModel]="search()" (ngModelChange)="search.set($event)" />

        <!-- Priority pills -->
        <div class="brd-prio-pills">
          <button class="badge brd-prio-all" [class.brd-pill-active]="!prioFilter()"
                  (click)="prioFilter.set('')">{{ 'board.allPriorities' | t }}</button>
          @for (p of PRIORITIES; track p) {
            <button class="badge" [class]="'prio-' + p" [class.brd-pill-active]="prioFilter() === p"
                    (click)="prioFilter.set(prioFilter() === p ? '' : p)">{{ 'pr.' + p | t }}</button>
          }
        </div>

        <!-- Type -->
        <select class="brd-select" [ngModel]="typeFilter()" (ngModelChange)="typeFilter.set($event)">
          <option value="">{{ 'board.allTypes' | t }}</option>
          @for (ty of TASK_TYPES; track ty) {
            <option [value]="ty">{{ 'ty.' + ty | t }}</option>
          }
        </select>

        <!-- Assignee -->
        @if (assignees().length) {
          <select class="brd-select" [ngModel]="assigneeFilter()" (ngModelChange)="assigneeFilter.set($event)">
            <option value="">{{ 'board.allAssignees' | t }}</option>
            @for (a of assignees(); track a.id) {
              <option [value]="a.id">{{ a.name }}</option>
            }
          </select>
        }

        <!-- Clear + counter -->
        <div class="brd-filter-end">
          @if (activeFilters() > 0) {
            <button class="btn btn-sm btn-ghost brd-clear-btn" (click)="clearFilters()">
              ✕ {{ 'board.clearFilters' | t }}
            </button>
          }
          @if (activeFilters() > 0) {
            <span class="brd-showing text-xs muted">
              {{ 'board.showing' | t }} <strong>{{ filtered().length }}</strong> {{ 'board.of' | t }} {{ tasks().length }}
            </span>
          }
        </div>
      </div>
    }

    @if (loading()) { <div class="spin"></div> } @else {
      <div class="board-scroll-hint text-xs muted no-print">← {{ 'board.swipe' | t }} →</div>
      <div class="board">
        @for (col of columns; track col) {
          <div class="column">
            <div class="col-head">
              <span class="badge" [class]="'st-' + col">{{ 'st.' + col | t }}</span>
              <span class="count">{{ grouped()[col].length }}</span>
            </div>
            <div class="col-body" cdkDropList [cdkDropListData]="grouped()[col]" [id]="col"
                 [cdkDropListConnectedTo]="columns" (cdkDropListDropped)="drop($event, col)">
              @for (t of grouped()[col]; track t.id) {
                <div class="tcard" cdkDrag>
                  <div class="flex justify-between items-center">
                    <span class="badge" [class]="'prio-' + t.priority">{{ 'pr.' + t.priority | t }}</span>
                    @if (t.startDate && t.status !== 'Done' && t.status !== 'Cancelled') { <span class="badge st-InProgress" style="font-size:10px">⏱</span> }
                  </div>
                  <a class="tcard-title" [routerLink]="['/tasks', t.id]" dir="auto">{{ t.title }}</a>
                  <div class="flex wrap gap-1">
                    @for (tag of t.tags; track tag.id) {
                      <span class="mini-tag" [style.background]="tag.color">{{ tag.name }}</span>
                    }
                  </div>
                  <div class="tcard-foot">
                    <span class="proj-dot" [style.background]="t.projectColor"></span>
                    <span class="text-xs muted">{{ t.projectName }}</span>
                    <span class="spacer"></span>
                    @if (t.commentCount) { <span class="text-xs muted">💬 {{ t.commentCount }}</span> }
                    @if (t.assigneeName) {
                      <span class="avatar sm" [style.background]="t.assigneeColor || '#64748b'" [title]="t.assigneeName">{{ ini(t.assigneeName) }}</span>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>
    }
  </div>

  @if (showForm()) {
    <app-task-form [defaultStatus]="newStatus" [defaultProjectId]="projectFilter"
      (saved)="onSaved()" (cancel)="showForm.set(false)"></app-task-form>
  }
  `
})
export class TaskBoard implements OnInit {
  private taskSvc    = inject(TaskService);
  private projectSvc = inject(ProjectService);
  private auth       = inject(AuthService);
  i18n               = inject(I18nService);

  readonly columns     = BOARD_COLUMNS;
  readonly PRIORITIES  = PRIORITIES;
  readonly TASK_TYPES  = TASK_TYPES;

  tasks    = signal<TaskListItem[]>([]);
  projects = signal<Project[]>([]);
  loading  = signal(true);
  showForm = signal(false);
  newStatus: WorkTaskStatus = 'Backlog';
  projectFilter?: number;

  // ── Filters ──────────────────────────────────────────────
  showFilters    = signal(false);
  search         = signal('');
  prioFilter     = signal('');
  typeFilter     = signal('');
  assigneeFilter = signal('');

  activeFilters = computed(() =>
    [this.search().trim(), this.prioFilter(), this.typeFilter(), this.assigneeFilter()].filter(Boolean).length
  );

  assignees = computed(() => {
    const map = new Map<number, string>();
    for (const t of this.tasks())
      if (t.assigneeId && t.assigneeName) map.set(t.assigneeId, t.assigneeName);
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  });

  filtered = computed(() => {
    let list = this.tasks();
    const s = this.search().trim().toLowerCase();
    if (s) list = list.filter(t => t.title.toLowerCase().includes(s));
    if (this.prioFilter()) list = list.filter(t => t.priority === this.prioFilter());
    if (this.typeFilter())  list = list.filter(t => t.type     === this.typeFilter());
    if (this.assigneeFilter()) list = list.filter(t => String(t.assigneeId) === this.assigneeFilter());
    return list;
  });

  grouped = computed(() => {
    const map = {} as Record<WorkTaskStatus, TaskListItem[]>;
    for (const c of this.columns) map[c] = [];
    for (const t of this.filtered()) (map[t.status] ??= []).push(t);
    return map;
  });

  ini    = initials;
  label  = (s: WorkTaskStatus) => STATUS_LABELS[s];
  canEdit = () => this.auth.hasRole('Admin', 'Technician');

  ngOnInit() {
    this.projectSvc.getAll().subscribe(p => this.projects.set(p));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.taskSvc.board(this.projectFilter).subscribe(t => { this.tasks.set(t); this.loading.set(false); });
  }

  clearFilters() {
    this.search.set(''); this.prioFilter.set('');
    this.typeFilter.set(''); this.assigneeFilter.set('');
  }

  openNew() { this.newStatus = 'Backlog'; this.showForm.set(true); }
  onSaved() { this.showForm.set(false); this.load(); }

  drop(event: CdkDragDrop<TaskListItem[]>, targetCol: WorkTaskStatus) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    }
    const moved = event.container.data[event.currentIndex];
    moved.status = targetCol;
    this.taskSvc.move(moved.id, targetCol, event.currentIndex).subscribe({ error: () => this.load() });
  }
}
