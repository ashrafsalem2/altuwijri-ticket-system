import { Component, Input, OnInit, OnChanges, SimpleChanges, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TaskService } from '../../core/services/task.service';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
import { AttachmentService, ChatService, UserService } from '../../core/services/data.services';
import { TaskForm } from './task-form';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { TicketLifetime } from '../../shared/ticket-lifetime';
import { Attachment, Comment, STATUS_LABELS, TASK_STATUSES, TYPE_LABELS, TaskDetail as TaskDetailModel, User } from '../../core/models/models';
import { initials, timeAgo, typeIcon } from '../../shared/util';

@Component({
  selector: 'app-task-detail',
  imports: [RouterLink, FormsModule, DatePipe, TaskForm, TranslatePipe, TicketLifetime],
  styleUrl: './task-detail.scss',
  template: `
  <div class="page" [attr.dir]="i18n.dir()">
    @if (loading()) { <div class="spin"></div> }
    @else if (task(); as t) {
      <div class="page-header">
        <div class="flex items-center gap-1">
          <a routerLink="/tasks" class="btn btn-ghost btn-sm">← {{ 'nav.tasks' | t }}</a>
          <span class="badge" [class]="'st-' + t.status">{{ label(t.status) }}</span>
          <span class="badge" [class]="'prio-' + t.priority">{{ t.priority }}</span>
          <span class="type-badge">{{ tIcon(t.type) }} {{ typeLabel(t.type) }}</span>
        </div>
        <div class="flex gap-1">
          <button class="btn btn-ghost" (click)="discuss(t)">💬 {{ 'chat.discuss' | t }}</button>
          @if (canEdit()) {
            <button class="btn btn-ghost" (click)="showEdit.set(true)">{{ 'c.edit' | t }}</button>
            @if (canDelete()) { <button class="btn btn-danger" (click)="remove()">{{ 'c.delete' | t }}</button> }
          }
        </div>
      </div>

      <div class="detail-grid">
        <div class="card card-pad">
          <h2 dir="auto">{{ t.title }}</h2>
          <p class="desc">{{ t.description || ('task.noDesc' | t) }}</p>

          @if (t.tags.length) {
            <div class="flex wrap gap-1 mt-1">
              @for (tag of t.tags; track tag.id) {
                <span class="mini-tag" [style.background]="tag.color">
                  @if (tag.icon) { {{ tag.icon }} }
                  {{ tag.name }}
                </span>
              }
            </div>
          }

          @if (t.subTasks.length) {
            <h4 class="mt-2">{{ 'task.subtasks' | t }}</h4>
            @for (s of t.subTasks; track s.id) {
              <div class="subtask"><a [routerLink]="['/tasks', s.id]">{{ s.title }}</a>
                <span class="badge" [class]="'st-' + s.status">{{ label(s.status) }}</span></div>
            }
          }

          <h4 class="mt-2">{{ 'task.attachments' | t }}</h4>
          <div class="attachments">
            @for (a of attachments(); track a.id) {
              <div class="att-item">
                @if (a.kind === 'Image' && imgUrls()[a.id]) {
                  <button class="att-thumb" (click)="openLightbox(imgUrls()[a.id])">
                    <img [src]="imgUrls()[a.id]" [alt]="a.fileName" />
                  </button>
                } @else if (a.kind === 'Link') {
                  <a [href]="a.url" target="_blank" rel="noopener" class="att-icon">🔗</a>
                } @else {
                  <button class="att-icon" (click)="download(a)">📄</button>
                }
                <div class="att-meta">
                  @if (a.kind === 'Link') {
                    <a [href]="a.url" target="_blank" rel="noopener" class="att-name">{{ a.fileName }}</a>
                    <span class="text-xs muted">{{ a.url }}</span>
                  } @else {
                    <button class="att-name link-like" (click)="download(a)">{{ a.fileName }}</button>
                    <span class="text-xs muted">{{ fmtSize(a.sizeBytes) }}</span>
                  }
                </div>
                @if (canEdit()) { <button class="btn btn-sm btn-ghost" (click)="deleteAttachment(a)">✕</button> }
              </div>
            } @empty { <div class="muted text-sm">{{ 'task.noAttachments' | t }}</div> }
          </div>
          @if (canEdit()) {
            <div class="att-actions mt-1">
              <label class="btn btn-sm btn-ghost">
                📎 {{ 'task.upload' | t }}<input type="file" hidden (change)="upload($event)" />
              </label>
              <button class="btn btn-sm btn-ghost" (click)="showLink.set(!showLink())">🔗 {{ 'task.addUrl' | t }}</button>
            </div>
            @if (showLink()) {
              <div class="link-form mt-1">
                <input class="input" placeholder="{{ 'task.urlTitle' | t }}" [(ngModel)]="linkTitle" />
                <input class="input" placeholder="https://…" [(ngModel)]="linkUrl" />
                <button class="btn btn-primary btn-sm" (click)="addLink()" [disabled]="!linkUrl.trim()">{{ 'c.add' | t }}</button>
              </div>
            }
            @if (uploadErr()) { <div class="err mt-1">{{ uploadErr() }}</div> }
          }

          <h4 class="mt-2">{{ 'task.comments' | t }}</h4>
          <div class="comments">
            @for (c of comments(); track c.id) {
              <div class="comment">
                <span class="avatar" [style.background]="c.authorColor || '#64748b'">{{ ini(c.authorName) }}</span>
                <div class="c-body">
                  <div><strong>{{ c.authorName }}</strong> <span class="text-xs muted">{{ ago(c.createdAt) }}</span></div>
                  <div class="text-sm">{{ c.content }}</div>
                </div>
              </div>
            } @empty { <div class="muted text-sm">{{ 'task.noComments' | t }}</div> }
          </div>

          @if (canEdit()) {
            <div class="add-comment mt-1">
              <input class="input" placeholder="{{ 'task.commentPlaceholder' | t }}" [(ngModel)]="newComment" (keyup.enter)="addComment()" />
              <button class="btn btn-primary" (click)="addComment()" [disabled]="!newComment.trim()">{{ 'c.post' | t }}</button>
            </div>
          }
        </div>

        <div class="card card-pad meta">
          <!-- Pretty lifetime card at the top of meta panel -->
          <app-ticket-lifetime [dueDate]="t.dueDate" [status]="t.status" [createdAt]="t.createdAt" [startDate]="t.startDate" [card]="true" [showEmpty]="true"></app-ticket-lifetime>

          <!-- Handler banner — Admin/Manager only -->
          @if (showHandlerPanel() && !isTechnician()) {
            <div class="handler-banner">
              <div class="handler-banner-body">
                <span class="handler-banner-icon">🎯</span>
                <div class="handler-banner-text">
                  <strong>{{ 'handler.actionRequired' | t }}</strong>
                  <span>{{ 'handler.setFields' | t }}</span>
                </div>
              </div>
              <button class="handler-banner-btn" (click)="showHandlerModal.set(true)">
                Accept ticket →
              </button>
            </div>
          }

          <!-- Technician quick-update panel -->
          @if (isTechnician()) {
            <div class="tech-panel">
              <div class="tech-panel-title">{{ 'tech.panel' | t }}</div>

              @if (task()!.status === 'Done') {
                <div class="tech-closed tech-done">✓ {{ 'tech.completed' | t }}</div>
              } @else if (task()!.status === 'Cancelled') {
                <div class="tech-closed tech-cancelled">✕ {{ 'tech.cancelled' | t }}</div>
              } @else if (task()!.status === 'Backlog' || task()!.status === 'ToDo') {
                <!-- Accept phase: commit to an estimate before work begins -->
                <p class="tech-accept-hint">{{ 'tech.acceptHint' | t }}</p>
                <button class="btn btn-primary" style="width:100%"
                  (click)="showTechAcceptModal.set(true)" [disabled]="quickSaving()">
                  ✓ {{ 'tech.acceptBtn' | t }}
                </button>
              } @else {
                <!-- Active work phase: status, progress, hours -->
                <div class="m-row mt-1">
                  <span class="m-lbl">{{ 'tech.status' | t }}</span>
                  <select class="input" [(ngModel)]="quickStatus">
                    @for (s of techStatuses; track s) { <option [value]="s">{{ 'st.' + s | t }}</option> }
                  </select>
                </div>

                <div class="m-row">
                  <span class="m-lbl">{{ 'tech.progress' | t }}</span>
                  <div class="flex items-center gap-1" style="flex:1">
                    <input type="range" min="0" max="100" step="5" [(ngModel)]="quickProgress" style="flex:1" />
                    <span class="text-sm mono" style="width:2.8rem;text-align:end">{{ quickProgress }}%</span>
                  </div>
                </div>

                <div class="m-row">
                  <span class="m-lbl">{{ 'tech.estHours' | t }}</span>
                  <input class="input" type="number" min="0" step="0.5" [(ngModel)]="quickEstHours"
                    placeholder="hrs" style="width:80px" />
                </div>

                <div class="m-row">
                  <span class="m-lbl">{{ 'tech.actHours' | t }}</span>
                  <input class="input" type="number" min="0" step="0.5" [(ngModel)]="quickActHours"
                    placeholder="hrs" style="width:80px" />
                </div>

                <button class="btn btn-primary" style="width:100%;margin-top:.6rem"
                  (click)="quickUpdate(task()!)" [disabled]="quickSaving()">
                  {{ quickSaving() ? ('c.saving' | t) : ('tech.save' | t) }}
                </button>

                @if (task()!.status === 'InProgress' || task()!.status === 'Blocked') {
                  <div class="tech-review-wrap">
                    <button class="btn tech-review-btn" (click)="requestReview(task()!)" [disabled]="quickSaving()">
                      ✓ {{ 'tech.requestReview' | t }}
                    </button>
                    <span class="tech-review-hint">{{ 'tech.reviewHint' | t }}</span>
                  </div>
                }

                @if (quickSaved()) {
                  <div class="text-sm text-center mt-1" style="color:var(--success)">✓ {{ 'tech.saved' | t }}</div>
                }
              }
            </div>
          }

          <div class="meta-divider"></div>
          <div class="m-row"><span class="m-lbl">{{ 'task.project' | t }}</span><span>{{ t.projectName }}</span></div>
          <div class="m-row"><span class="m-lbl">{{ 'org.branch' | t }}</span><span>{{ t.branchName || '—' }}</span></div>
          <div class="m-row"><span class="m-lbl">{{ 'task.type' | t }}</span><span>{{ tIcon(t.type) }} {{ typeLabel(t.type) }}</span></div>
          <div class="m-row"><span class="m-lbl">{{ 'task.assignee' | t }}</span><span>{{ t.assigneeName || ('task.unassigned' | t) }}</span></div>
          <div class="m-row"><span class="m-lbl">{{ 'task.reporter' | t }}</span><span>{{ t.reporterName || '—' }}</span></div>
          <div class="m-row"><span class="m-lbl">{{ 'task.startDate' | t }}</span><span>{{ t.startDate ? (t.startDate | date:'mediumDate') : '—' }}</span></div>
          <div class="m-row"><span class="m-lbl">{{ 'task.dueDate' | t }}</span><span>{{ t.dueDate ? (t.dueDate | date:'mediumDate') : '—' }}</span></div>
          <div class="m-row"><span class="m-lbl">{{ 'task.slaDue' | t }}</span><span>{{ t.slaDueDate ? (t.slaDueDate | date:'mediumDate') : '—' }}</span></div>
          <div class="m-row"><span class="m-lbl">{{ 'task.estimate' | t }}</span><span>{{ t.estimatedHours ?? '—' }} h</span></div>
          <div class="m-row"><span class="m-lbl">{{ 'task.actual' | t }}</span><span>{{ t.actualHours ?? '—' }} h</span></div>
          <div class="m-row"><span class="m-lbl">{{ 'task.progress' | t }}</span><span>{{ t.progress }}%</span></div>
          <div class="progress"><div class="progress-fill" [style.width.%]="t.progress"></div></div>
          <div class="m-row mt-1"><span class="m-lbl">{{ 'task.created' | t }}</span><span class="text-sm">{{ t.createdAt | date:'medium' }}</span></div>
        </div>
      </div>
    } @else { <div class="empty">{{ 'task.notFound' | t }}</div> }
  </div>

  @if (showEdit() && task()) {
    <app-task-form [task]="task()!" (saved)="onSaved()" (cancel)="showEdit.set(false)"></app-task-form>
  }

  <!-- Technician accept modal -->
  @if (showTechAcceptModal() && task(); as t) {
    <div class="hm-overlay" (click)="showTechAcceptModal.set(false)">
      <div class="hm-modal card" (click)="$event.stopPropagation()">

        <div class="hm-head">
          <div class="hm-head-left">
            <span class="hm-head-icon">✅</span>
            <div>
              <h3 class="hm-title">{{ 'tech.acceptBtn' | t }}</h3>
              <p class="hm-subtitle">{{ 'tech.acceptHint' | t }}</p>
            </div>
          </div>
          <button class="hm-close" (click)="showTechAcceptModal.set(false)">✕</button>
        </div>

        <div class="hm-body">
          <div class="tech-accept-ticket-ref" dir="auto">#{{ t.id }} — {{ t.title }}</div>

          <div class="hm-grid">

            <div class="hm-field">
              <label>{{ 'handler.due' | t }}</label>
              @if (t.dueDate) {
                <div class="tech-accept-info">📅 {{ t.dueDate | date:'mediumDate' }} <span class="muted text-xs">({{ 'tech.dueMgr' | t }})</span></div>
              } @else {
                <input class="input" type="date" [(ngModel)]="techAcceptDue" [min]="todayStr()"
                  placeholder="{{ 'tech.dueYou' | t }}" />
              }
            </div>

            <div class="hm-field">
              <label>{{ 'handler.sla' | t }}</label>
              @if (t.slaDueDate) {
                <div class="tech-accept-info">📅 {{ t.slaDueDate | date:'mediumDate' }} <span class="muted text-xs">({{ 'tech.dueMgr' | t }})</span></div>
              } @else {
                <input class="input" type="date" [(ngModel)]="techAcceptSla"
                  [min]="techAcceptDue || todayStr()" />
              }
            </div>

            <div class="hm-field hm-field-full">
              <label>{{ 'handler.hours' | t }} <span style="color:var(--danger)">*</span></label>
              <input class="input" type="number" min="0" step="0.5" [(ngModel)]="techAcceptHours"
                placeholder="e.g. 4" style="max-width:160px" />
            </div>

          </div>

          @if (techAcceptErr()) { <div class="hm-err">{{ techAcceptErr() | t }}</div> }
        </div>

        <div class="hm-foot">
          <button class="btn btn-ghost" (click)="showTechAcceptModal.set(false)">{{ 'c.cancel' | t }}</button>
          <button class="btn btn-primary" (click)="techAccept(t)" [disabled]="quickSaving()">
            {{ quickSaving() ? ('c.saving' | t) : ('tech.confirmStart' | t) }}
          </button>
        </div>

      </div>
    </div>
  }

  <!-- Handler accept modal -->
  @if (showHandlerModal() && task(); as t) {
    <div class="hm-overlay" (click)="showHandlerModal.set(false)">
      <div class="hm-modal card" (click)="$event.stopPropagation()">

        <div class="hm-head">
          <div class="hm-head-left">
            <span class="hm-head-icon">🎯</span>
            <div>
              <h3 class="hm-title">{{ 'handler.title' | t }}</h3>
              <p class="hm-subtitle">{{ 'handler.hint' | t }}</p>
            </div>
          </div>
          <button class="hm-close" (click)="showHandlerModal.set(false)">✕</button>
        </div>

        <div class="hm-body">
          <div class="hm-grid">

            <div class="hm-field hm-field-full">
              <label>{{ 'handler.status' | t }}</label>
              <select class="input" [(ngModel)]="hStatus">
                @for (s of statuses; track s) { <option [value]="s">{{ 'st.' + s | t }}</option> }
              </select>
            </div>

            @if (!isTechnician()) {
              <div class="hm-field hm-field-full">
                <label>{{ 'handler.assign' | t }}</label>
                <select class="input" [(ngModel)]="hAssigneeId">
                  <option [ngValue]="null">— {{ 'task.unassigned' | t }} —</option>
                  @for (u of staffUsers(); track u.id) { <option [ngValue]="u.id">{{ u.fullName }}</option> }
                </select>
              </div>
            }

            <div class="hm-field">
              <label>{{ 'handler.due' | t }}</label>
              <input class="input" type="date" [(ngModel)]="hDueDate" [min]="todayStr()" />
            </div>

            <div class="hm-field">
              <label>
                {{ 'handler.sla' | t }}
                <span class="hm-label-hint">{{ 'handler.slaHint' | t }}</span>
              </label>
              <input class="input" type="date" [(ngModel)]="hSlaDate" [min]="hDueDate || todayStr()" />
            </div>

            <div class="hm-field">
              <label>{{ 'handler.hours' | t }}</label>
              <input class="input" type="number" min="0" step="0.5" [(ngModel)]="hHours" placeholder="e.g. 4" />
            </div>

          </div>
        </div>

        <div class="hm-foot">
          @if (handlerSaved()) { <span class="hm-success">✓ {{ 'handler.accepted' | t }}</span> }
          @if (handlerErr()) { <span class="hm-err">{{ handlerErr() }}</span> }
          <button class="btn btn-ghost" (click)="showHandlerModal.set(false)">{{ 'c.cancel' | t }}</button>
          <button class="btn btn-primary" (click)="acceptTicket(t)" [disabled]="handlerSaving()">
            {{ handlerSaving() ? ('c.saving' | t) : ('handler.accept' | t) }}
          </button>
        </div>

      </div>
    </div>
  }

  <!-- Image lightbox -->
  @if (lightboxSrc()) {
    <div class="lightbox-overlay" (click)="lightboxSrc.set(null)">
      <button class="lightbox-close" (click)="lightboxSrc.set(null)">✕</button>
      <img class="lightbox-img" [src]="lightboxSrc()!" (click)="$event.stopPropagation()" />
    </div>
  }
  `
})
export class TaskDetail implements OnInit, OnChanges {
  @Input() id!: string;
  private taskSvc = inject(TaskService);
  private auth = inject(AuthService);
  i18n = inject(I18nService);
  private router = inject(Router);
  private attachmentSvc = inject(AttachmentService);
  private chatSvc = inject(ChatService);
  private userSvc = inject(UserService);

  task = signal<TaskDetailModel | null>(null);
  comments = signal<Comment[]>([]);
  attachments = signal<Attachment[]>([]);
  imgUrls = signal<Record<number, string>>({});
  loading = signal(true);
  showEdit = signal(false);
  showLink = signal(false);
  uploadErr = signal('');
  lightboxSrc = signal<string | null>(null);
  showHandlerModal = signal(false);
  newComment = '';
  linkTitle = '';
  linkUrl = '';

  // Handler panel
  staffUsers = signal<User[]>([]);
  handlerSaving = signal(false);
  handlerSaved = signal(false);
  handlerErr = signal('');
  hStatus = 'InProgress';
  hAssigneeId: number | null = null;
  hDueDate = '';
  hSlaDate = '';
  hHours: number | null = null;

  readonly statuses = TASK_STATUSES;

  ini = initials; ago = timeAgo;
  tIcon = (t: string) => typeIcon(t as any);
  label = (s: any) => STATUS_LABELS[s as keyof typeof STATUS_LABELS] ?? s;
  typeLabel = (t: any) => TYPE_LABELS[t as keyof typeof TYPE_LABELS] ?? t;
  canEdit = () => this.auth.hasRole('Admin', 'Manager', 'Technician');
  canDelete = () => this.auth.hasRole('Admin', 'Manager');
  isStaff = () => this.auth.hasRole('Admin', 'Manager', 'Technician');
  isTechnician = () => this.auth.user()?.role === 'Technician';

  showHandlerPanel = computed(() => {
    if (!this.isStaff()) return false;
    const t = this.task();
    if (!t) return false;
    return !t.dueDate || !t.assigneeId || !t.estimatedHours;
  });

  // Technician quick-update state (Done is excluded — only manager can close)
  readonly techStatuses = ['InProgress', 'InReview', 'Blocked'] as const;
  quickStatus = 'InProgress';
  quickProgress = 0;
  quickEstHours: number | null = null;
  quickActHours: number | null = null;
  quickSaving = signal(false);
  quickSaved = signal(false);

  // Technician accept modal state
  showTechAcceptModal = signal(false);
  techAcceptDue = '';
  techAcceptSla = '';
  techAcceptHours: number | null = null;
  techAcceptErr = signal('');

  ngOnInit() { this.load(); }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['id'] && !changes['id'].firstChange) this.load();
  }

  load() {
    const id = Number(this.id);
    this.loading.set(true);
    this.taskSvc.get(id).subscribe({
      next: t => {
        this.task.set(t);
        this.loading.set(false);
        if (this.isStaff()) {
          this.hStatus = t.status === 'Backlog' || t.status === 'ToDo' ? 'InProgress' : t.status;
          this.hAssigneeId = t.assigneeId ?? null;
          this.hDueDate = t.dueDate?.substring(0, 10) ?? '';
          this.hSlaDate = t.slaDueDate?.substring(0, 10) ?? '';
          this.hHours = t.estimatedHours ?? null;
          this.userSvc.getAll().subscribe(u => this.staffUsers.set(u));
        }
        if (this.isTechnician()) {
          this.quickStatus = (t.status === 'Backlog' || t.status === 'ToDo') ? 'InProgress' : t.status;
          this.quickProgress = t.progress ?? 0;
          this.quickEstHours = t.estimatedHours ?? null;
          this.quickActHours = t.actualHours ?? null;
        }
      },
      error: () => this.loading.set(false)
    });
    this.taskSvc.comments(id).subscribe(c => this.comments.set(c));
    this.attachmentSvc.list(id).subscribe(a => { this.attachments.set(a); this.loadThumbnails(a); });
  }

  private loadThumbnails(items: Attachment[]) {
    for (const a of items.filter(x => x.kind === 'Image' && !this.imgUrls()[x.id])) {
      this.attachmentSvc.getBlob(Number(this.id), a.id).subscribe(blob => {
        const url = URL.createObjectURL(blob);
        this.imgUrls.update(m => ({ ...m, [a.id]: url }));
      });
    }
  }

  openLightbox(src: string) { this.lightboxSrc.set(src); }

  download(a: Attachment) {
    this.attachmentSvc.getBlob(Number(this.id), a.id).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = a.fileName;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  fmtSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  upload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadErr.set('');
    this.attachmentSvc.upload(Number(this.id), file).subscribe({
      next: a => {
        this.attachments.update(list => [a, ...list]);
        if (a.kind === 'Image') this.loadThumbnails([a]);
        input.value = '';
      },
      error: e => this.uploadErr.set(e?.error?.title ?? 'Upload failed.')
    });
  }

  addLink() {
    if (!this.linkUrl.trim()) return;
    this.uploadErr.set('');
    this.attachmentSvc.addLink(Number(this.id), this.linkTitle.trim(), this.linkUrl.trim()).subscribe({
      next: a => { this.attachments.update(list => [a, ...list]); this.linkTitle = ''; this.linkUrl = ''; this.showLink.set(false); },
      error: e => this.uploadErr.set(e?.error?.title ?? 'Could not add link.')
    });
  }

  deleteAttachment(a: Attachment) {
    if (!confirm(`Remove "${a.fileName}"?`)) return;
    this.attachmentSvc.delete(Number(this.id), a.id).subscribe(() => this.attachments.update(l => l.filter(x => x.id !== a.id)));
  }

  techAccept(t: TaskDetailModel) {
    if (!this.techAcceptHours) { this.techAcceptErr.set('tech.estRequired'); return; }
    this.techAcceptErr.set('');
    this.quickSaving.set(true);
    const payload = {
      title: t.title, description: t.description, status: 'InProgress' as any,
      priority: t.priority, type: t.type, projectId: t.projectId,
      branchId: t.branchId ?? null, assigneeId: t.assigneeId ?? null,
      startDate: new Date().toISOString(),
      dueDate: t.dueDate ?? (this.techAcceptDue ? `${this.techAcceptDue}T18:00:00` : null),
      slaDueDate: t.slaDueDate ?? (this.techAcceptSla ? `${this.techAcceptSla}T18:00:00` : null),
      estimatedHours: this.techAcceptHours,
      actualHours: t.actualHours ?? null,
      progress: 5,
      tagIds: t.tags.map(tg => tg.id)
    };
    this.taskSvc.update(t.id, payload as any).subscribe({
      next: () => {
        this.quickSaving.set(false);
        this.showTechAcceptModal.set(false);
        this.quickStatus = 'InProgress';
        this.quickProgress = 5;
        this.quickEstHours = this.techAcceptHours;
        this.load();
      },
      error: e => { this.quickSaving.set(false); this.techAcceptErr.set(e?.error?.title ?? 'Save failed.'); }
    });
  }

  acceptTicket(t: TaskDetailModel) {
    this.handlerSaving.set(true);
    this.handlerErr.set('');
    const payload = {
      title: t.title, description: t.description, status: this.hStatus as any,
      priority: t.priority, type: t.type, projectId: t.projectId,
      branchId: t.branchId ?? null, assigneeId: this.hAssigneeId,
      startDate: new Date().toISOString(),   // record exact acceptance time
      dueDate: this.hDueDate ? `${this.hDueDate}T18:00:00` : null,
      slaDueDate: this.hSlaDate ? `${this.hSlaDate}T18:00:00` : null,
      estimatedHours: this.hHours,
      actualHours: t.actualHours ?? null,
      progress: t.progress,
      tagIds: t.tags.map(tg => tg.id)
    };
    this.taskSvc.update(t.id, payload as any).subscribe({
      next: () => {
        this.handlerSaving.set(false);
        this.handlerSaved.set(true);
        setTimeout(() => {
          this.handlerSaved.set(false);
          this.showHandlerModal.set(false);
          this.load();
        }, 1200);
      },
      error: e => { this.handlerSaving.set(false); this.handlerErr.set(e?.error?.title ?? 'Save failed.'); }
    });
  }

  discuss(t: TaskDetailModel) {
    if (t.assigneeId && t.assigneeId !== this.auth.user()?.id) {
      this.chatSvc.start(t.assigneeId, `Re: ${t.title}`, t.id).subscribe({
        next: () => this.router.navigate(['/chat']),
        error: () => this.router.navigate(['/chat'])
      });
    } else {
      this.router.navigate(['/chat']);
    }
  }

  addComment() {
    const content = this.newComment.trim();
    if (!content) return;
    this.taskSvc.addComment(Number(this.id), content).subscribe(c => {
      this.comments.update(cs => [...cs, c]); this.newComment = '';
    });
  }

  remove() {
    if (!confirm('Delete this task?')) return;
    this.taskSvc.delete(Number(this.id)).subscribe(() => this.router.navigate(['/tasks']));
  }

  onSaved() { this.showEdit.set(false); this.load(); }

  todayStr() { return new Date().toISOString().substring(0, 10); }

  startWork(t: TaskDetailModel) {
    this.quickStatus = 'InProgress';
    this.quickProgress = this.quickProgress || 5;
    this._startedNow = new Date().toISOString(); // capture exact work-start time
    this.quickUpdate(t);
  }

  private _startedNow: string | null = null;

  requestReview(t: TaskDetailModel) {
    this.quickStatus = 'InReview';
    this.quickProgress = Math.max(this.quickProgress, 90);
    this.quickUpdate(t);
  }

  quickUpdate(t: TaskDetailModel) {
    this.quickSaving.set(true);
    const payload = {
      title: t.title, description: t.description,
      status: this.quickStatus as any,
      priority: t.priority, type: t.type, projectId: t.projectId,
      branchId: t.branchId ?? null, assigneeId: t.assigneeId ?? null,
      startDate: this._startedNow ?? t.startDate ?? null,
      dueDate: t.dueDate ?? null,
      slaDueDate: t.slaDueDate ?? null,
      estimatedHours: this.quickEstHours,
      actualHours: this.quickActHours,
      progress: this.quickProgress,
      tagIds: t.tags.map(tg => tg.id)
    };
    this.taskSvc.update(t.id, payload as any).subscribe({
      next: () => {
        this._startedNow = null;
        this.quickSaving.set(false);
        this.quickSaved.set(true);
        setTimeout(() => { this.quickSaved.set(false); this.load(); }, 1200);
      },
      error: () => { this._startedNow = null; this.quickSaving.set(false); }
    });
  }
}
