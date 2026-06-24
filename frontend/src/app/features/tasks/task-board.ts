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
  BOARD_COLUMNS, Project, STATUS_LABELS, TaskListItem, WorkTaskStatus
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
        <select [(ngModel)]="projectFilter" (ngModelChange)="load()">
          <option [ngValue]="undefined">{{ 'board.allProjects' | t }}</option>
          @for (p of projects(); track p.id) { <option [ngValue]="p.id">{{ p.name }}</option> }
        </select>
        @if (canEdit()) { <button class="btn btn-primary" (click)="openNew()">+ {{ 'task.new' | t }}</button> }
      </div>
    </div>

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
                    @if (t.isOverdue) { <span class="badge prio-Critical">{{ 'board.overdue' | t }}</span> }
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
  private taskSvc = inject(TaskService);
  private projectSvc = inject(ProjectService);
  private auth = inject(AuthService);
  i18n = inject(I18nService);

  columns = BOARD_COLUMNS;
  tasks = signal<TaskListItem[]>([]);
  projects = signal<Project[]>([]);
  loading = signal(true);
  projectFilter?: number;
  showForm = signal(false);
  newStatus: WorkTaskStatus = 'Backlog';

  ini = initials;
  label = (s: WorkTaskStatus) => STATUS_LABELS[s];
  canEdit = () => this.auth.hasRole('Admin', 'Manager', 'Technician');

  grouped = computed(() => {
    const map = {} as Record<WorkTaskStatus, TaskListItem[]>;
    for (const c of this.columns) map[c] = [];
    for (const t of this.tasks()) (map[t.status] ??= []).push(t);
    return map;
  });

  ngOnInit() {
    this.projectSvc.getAll().subscribe(p => this.projects.set(p));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.taskSvc.board(this.projectFilter).subscribe(t => { this.tasks.set(t); this.loading.set(false); });
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
    // persist (boardOrder = index within column)
    this.taskSvc.move(moved.id, targetCol, event.currentIndex).subscribe({ error: () => this.load() });
  }
}
