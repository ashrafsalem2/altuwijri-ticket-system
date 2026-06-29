import { Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges, inject, signal, computed } from '@angular/core';
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
          <span class="badge" [class]="'st-' + t.status" [class.status-pop]="statusFlash()">{{ label(t.status) }}</span>
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
          <!-- Informative elapsed-time card -->
          <app-ticket-lifetime [startDate]="t.startDate" [completedAt]="t.completedAt" [status]="t.status" [card]="true" [showEmpty]="true"></app-ticket-lifetime>

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
                <!-- Accept phase: one click to start work -->
                <p class="tech-accept-hint">{{ 'tech.acceptHint' | t }}</p>
                <button class="btn btn-primary" style="width:100%"
                  (click)="techAccept(task()!)" [disabled]="quickSaving()">
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
          @if (t.categoryName) {
            <div class="m-row">
              <span class="m-lbl">{{ 'tc.title' | t }}</span>
              <span class="cat-meta-chip" [style.background]="t.categoryColor ? t.categoryColor + '18' : ''" [style.color]="t.categoryColor || ''">
                @if (t.categoryIcon) { {{ t.categoryIcon }} } {{ t.categoryName }}
              </span>
            </div>
          }
          <div class="m-row"><span class="m-lbl">{{ 'task.type' | t }}</span><span>{{ tIcon(t.type) }} {{ typeLabel(t.type) }}</span></div>
          <div class="m-row"><span class="m-lbl">{{ 'task.assignee' | t }}</span><span>{{ t.assigneeName || ('task.unassigned' | t) }}</span></div>
          <div class="m-row"><span class="m-lbl">{{ 'task.reporter' | t }}</span><span>{{ t.reporterName || '—' }}</span></div>
          <div class="m-row"><span class="m-lbl">{{ 'task.startDate' | t }}</span><span>{{ t.startDate ? (t.startDate | date:'medium') : '—' }}</span></div>
          @if (t.claimedAt) {
            <div class="m-row"><span class="m-lbl">{{ 'task.acceptedIn' | t }}</span><span class="resp-time-badge">{{ responseTime(t) }}</span></div>
          }
          @if (t.completedAt) {
            <div class="m-row"><span class="m-lbl">{{ 'task.completedAt' | t }}</span><span>{{ t.completedAt | date:'medium' }}</span></div>
          }
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

  <!-- Thumbs-up accepted animation -->
  @if (showThumbUp()) {
    <div class="anim-overlay" aria-hidden="true">
      <div class="thumbup-bubble">
        <span class="thumbup-emoji">👍</span>
        <span class="thumbup-label">Ticket Accepted!</span>
      </div>
    </div>
  }

  <!-- Celebration animation -->
  @if (showCelebration()) {
    <div class="anim-overlay celebration-overlay" aria-hidden="true">
      @for (p of confettiPieces; track p.id) {
        <div class="confetti-p"
          [style.left]="p.left"
          [style.width.px]="p.w"
          [style.height.px]="p.h"
          [style.background]="p.color"
          [style.border-radius]="p.br"
          [style.animation-delay]="p.animDelay"
          [style.animation-duration]="p.animDur">
        </div>
      }
      <div class="celebration-msg">🎉&nbsp; Ticket Completed! &nbsp;🎊</div>
    </div>
  }
  `
})
export class TaskDetail implements OnInit, OnChanges, OnDestroy {
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

  // ── Animations ────────────────────────────────────────────
  statusFlash    = signal(false);
  showThumbUp    = signal(false);
  showCelebration = signal(false);

  readonly confettiPieces = (() => {
    const colors = ['#008272','#0ea5e9','#f59e0b','#ec4899','#10b981','#6366f1','#f97316','#84cc16'];
    return Array.from({ length: 34 }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      left: `${((i * 3.07 + 0.8) % 97 + 1.5).toFixed(1)}%`,
      animDelay: `${(i * 0.09 % 1.25).toFixed(2)}s`,
      animDur:   `${(2.5 + (i % 7) * 0.28).toFixed(2)}s`,
      w: 8 + (i % 5) * 2,
      h: i % 3 === 0 ? 8 + (i % 4) * 3 : 5 + (i % 3) * 3,
      br: i % 4 === 0 ? '50%' : '2px'
    }));
  })();

  // Handler panel
  staffUsers = signal<User[]>([]);
  handlerSaving = signal(false);
  handlerSaved = signal(false);
  handlerErr = signal('');
  hStatus = 'InProgress';
  hAssigneeId: number | null = null;

  readonly statuses = TASK_STATUSES;

  ini = initials; ago = timeAgo;
  tIcon = (t: string) => typeIcon(t as any);
  label = (s: any) => STATUS_LABELS[s as keyof typeof STATUS_LABELS] ?? s;
  typeLabel = (t: any) => TYPE_LABELS[t as keyof typeof TYPE_LABELS] ?? t;
  canEdit = () => this.auth.hasRole('Admin', 'Technician');
  canDelete = () => this.auth.hasRole('Admin');
  isStaff = () => this.auth.hasRole('Admin', 'Technician');
  isTechnician = () => this.auth.user()?.role === 'Technician';

  showHandlerPanel = computed(() => {
    if (!this.isStaff()) return false;
    const t = this.task();
    if (!t) return false;
    return !t.assigneeId;
  });

  // Technician quick-update state (Done is excluded — only manager can close)
  readonly techStatuses = ['InProgress', 'InReview', 'Blocked'] as const;
  quickStatus = 'InProgress';
  quickProgress = 0;
  quickSaving = signal(false);
  quickSaved = signal(false);
  private commentPoll?: any;
  private taskPoll?: any;

  private triggerStatusFlash() {
    this.statusFlash.set(false);
    setTimeout(() => {
      this.statusFlash.set(true);
      setTimeout(() => this.statusFlash.set(false), 700);
    }, 16);
  }
  private triggerThumbUp() {
    this.showThumbUp.set(true);
    setTimeout(() => this.showThumbUp.set(false), 2700);
  }
  private triggerCelebration() {
    this.showCelebration.set(true);
    setTimeout(() => this.showCelebration.set(false), 4900);
  }

  ngOnInit() { this.load(); }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['id'] && !changes['id'].firstChange) this.load();
  }
  ngOnDestroy() { clearInterval(this.commentPoll); clearInterval(this.taskPoll); }

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
          this.userSvc.getAll().subscribe(u => this.staffUsers.set(u));
        }
        if (this.isTechnician()) {
          this.quickStatus = (t.status === 'Backlog' || t.status === 'ToDo') ? 'InProgress' : t.status;
          this.quickProgress = t.progress ?? 0;
        }
      },
      error: () => this.loading.set(false)
    });
    this.taskSvc.comments(id).subscribe(c => this.comments.set(c));
    clearInterval(this.commentPoll);
    this.commentPoll = setInterval(() => this.taskSvc.comments(id).subscribe(c => this.comments.set(c)), 10000);
    this.attachmentSvc.list(id).subscribe(a => { this.attachments.set(a); this.loadThumbnails(a); });

    // Poll the task itself so status changes by other users are reflected without a page refresh.
    clearInterval(this.taskPoll);
    this.taskPoll = setInterval(() => this.pollTask(id), 15000);
  }

  private pollTask(id: number) {
    this.taskSvc.get(id).subscribe({
      next: fresh => {
        const cur = this.task();
        if (!cur) return;
        const statusChanged = fresh.status !== cur.status;
        if (statusChanged || fresh.progress !== cur.progress ||
            fresh.assigneeId !== cur.assigneeId || fresh.assigneeName !== cur.assigneeName) {
          this.task.set(fresh);
        }
        if (statusChanged) {
          if (fresh.status === 'Done') this.triggerCelebration();
          else this.triggerStatusFlash();
        }
      }
    });
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
    this.quickSaving.set(true);
    this.taskSvc.claim(t.id).subscribe({
      next: () => {
        this.quickSaving.set(false);
        this.quickStatus = 'InProgress';
        this.triggerThumbUp();
        this.triggerStatusFlash();
        this.load();
      },
      error: () => this.quickSaving.set(false)
    });
  }

  acceptTicket(t: TaskDetailModel) {
    this.handlerSaving.set(true);
    this.handlerErr.set('');
    const payload = {
      title: t.title, description: t.description, status: this.hStatus as any,
      priority: t.priority, type: t.type, projectId: t.projectId,
      branchId: t.branchId ?? null, categoryId: t.categoryId ?? null,
      assigneeId: this.hAssigneeId,
      progress: t.progress, tagIds: t.tags.map(tg => tg.id)
    };
    this.taskSvc.update(t.id, payload as any).subscribe({
      next: () => {
        this.handlerSaving.set(false);
        this.handlerSaved.set(true);
        this.triggerThumbUp();
        if (this.hStatus === 'Done') this.triggerCelebration();
        else this.triggerStatusFlash();
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

  responseTime(t: TaskDetailModel): string {
    if (!t.claimedAt) return '—';
    const mins = Math.round((new Date(t.claimedAt).getTime() - new Date(t.createdAt).getTime()) / 60000);
    if (mins < 1) return '< 1 min';
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60), m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

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
      progress: this.quickProgress,
      tagIds: t.tags.map(tg => tg.id)
    };
    this.taskSvc.update(t.id, payload as any).subscribe({
      next: () => {
        this.quickSaving.set(false);
        this.quickSaved.set(true);
        if (this.quickStatus === 'Done') this.triggerCelebration();
        else this.triggerStatusFlash();
        setTimeout(() => { this.quickSaved.set(false); this.load(); }, 1200);
      },
      error: () => this.quickSaving.set(false)
    });
  }
}
