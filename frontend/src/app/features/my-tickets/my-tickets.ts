import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TaskService } from '../../core/services/task.service';
import { AttachmentService, ChatService } from '../../core/services/data.services';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import {
  TaskListItem, WorkTaskStatus, TaskPriority, STATUS_LABELS, AvailableTechnician, Attachment
} from '../../core/models/models';
import { initials } from '../../shared/util';

type EmpFilter = 'all' | 'notYet' | 'open' | 'inProcess' | 'complete';

const PRIO_COLORS: Record<TaskPriority, string> = {
  Low: '#22c55e', Medium: '#f59e0b', High: '#f97316', Critical: '#ef4444'
};

const TICKET_TEMPLATES = [
  'Computer not turning on',
  'Cannot access the internet',
  'Password reset needed',
  'Printer not working',
  'Application crashing',
  'VPN connection issue',
  'Email not receiving',
  'Screen / display problem',
  'Slow computer performance',
  'Keyboard / mouse not working',
  'Cannot log in to system',
  'File access denied',
];

const FILTER_STATUSES: Record<EmpFilter, WorkTaskStatus[] | null> = {
  all: null,
  notYet: ['Backlog', 'ToDo'],
  open: ['InProgress', 'Blocked'],
  inProcess: ['InReview'],
  complete: ['Done']
};

@Component({
  selector: 'app-my-tickets',
  imports: [RouterLink, FormsModule, DatePipe, TranslatePipe],
  styleUrl: './my-tickets.scss',
  template: `
  <div class="page" [attr.dir]="i18n.dir()">
    <div class="page-header">
      <h2>{{ 'myt.title' | t }}</h2>
      <button class="btn btn-primary" (click)="openForm()">{{ 'myt.new' | t }}</button>
    </div>

    <!-- Search + filter chips -->
    <div class="card card-pad filters">
      <input class="input" style="flex:1;min-width:180px" [placeholder]="'myt.search' | t"
             [(ngModel)]="search" (keyup)="applySearch()" />
      <div class="filter-chips">
        @for (f of filterOptions; track f.value) {
          <button class="chip" [class.active]="activeFilter() === f.value" (click)="setFilter(f.value)">
            {{ f.labelKey | t }}
            <span class="chip-count">{{ countFor(f.value) }}</span>
          </button>
        }
      </div>
    </div>

    <!-- Ticket list -->
    <div class="card mt-2">
      @if (loading()) {
        <div class="spin"></div>
      } @else {
        @for (t of displayedTickets(); track t.id) {
          <a [routerLink]="['/tasks', t.id]" class="ticket-row">
            <div class="tr-left">
              <span class="prio-dot" [style.background]="prioBg(t.priority)"></span>
              <div class="tr-info">
                <span class="tr-title">{{ t.title }}</span>
                <span class="tr-meta text-sm muted">
                  #{{ t.id }} · {{ t.dueDate ? (t.dueDate | date:'mediumDate') : ('lt.noDeadline' | t) }}
                  @if (t.assigneeName) { · {{ t.assigneeName }} }
                </span>
              </div>
            </div>
            <div class="tr-right">
              <span class="badge" [class]="'st-' + t.status">{{ lbl(t.status) }}</span>
              <div class="prog-wrap">
                <div class="prog-bar" [style.width.%]="t.progress"></div>
              </div>
              <span class="prog-pct text-xs muted">{{ t.progress }}%</span>
            </div>
          </a>
        } @empty {
          <div class="empty">{{ 'myt.empty' | t }}</div>
        }

        @if (totalPages() > 1) {
          <div class="pager">
            <button class="btn btn-sm btn-ghost" [disabled]="currentPage() === 1" (click)="goPage(currentPage() - 1)">{{ 'c.prev' | t }}</button>
            <span class="text-sm muted">{{ 'c.page' | t }} {{ currentPage() }} / {{ totalPages() }}</span>
            <button class="btn btn-sm btn-ghost" [disabled]="currentPage() === totalPages()" (click)="goPage(currentPage() + 1)">{{ 'c.next' | t }}</button>
          </div>
        }
      }
    </div>

    <div class="shortcut-hint text-xs muted">{{ 'myt.shortcutHint' | t }}</div>
  </div>

  <!-- New Ticket Modal -->
  @if (showForm()) {
    <div class="modal-overlay" (click)="closeForm()">
      <div class="modal-box" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <h3>{{ 'myt.newTitle' | t }}</h3>
          <button class="btn btn-icon btn-ghost" (click)="closeForm()">✕</button>
        </div>

        @if (!createdId()) {
          @if (formError()) { <div class="err">{{ formError() }}</div> }

          <!-- Quick templates -->
          <div class="form-group">
            <label class="tpl-lbl">{{ 'tpl.title' | t }}</label>
            <div class="tpl-chips">
              @for (tpl of templates; track tpl) {
                <button type="button" class="tpl-chip" [class.active]="form.title === tpl" (click)="form.title = tpl">{{ tpl }}</button>
              }
            </div>
          </div>

          <div class="form-group">
            <label>{{ 'task.title' | t }} <span class="req">*</span></label>
            <input class="input" [(ngModel)]="form.title" [placeholder]="'myt.titlePlaceholder' | t" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>{{ 'task.priority' | t }}</label>
              <select class="input" [(ngModel)]="form.priority">
                <option value="Low">{{ 'pr.Low' | t }}</option>
                <option value="Medium">{{ 'pr.Medium' | t }}</option>
                <option value="High">{{ 'pr.High' | t }}</option>
                <option value="Critical">{{ 'pr.Critical' | t }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ 'task.assignee' | t }} <span class="req">*</span></label>
              <select class="input" [(ngModel)]="form.assigneeId">
                <option [ngValue]="null">{{ 'myt.selectTech' | t }}</option>
                @for (tech of technicians(); track tech.id) {
                  <option [ngValue]="tech.id">{{ tech.fullName }}{{ tech.isAvailable ? ' ✓' : '' }}</option>
                }
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>{{ 'task.description' | t }}</label>
            <textarea class="input" rows="3" [(ngModel)]="form.description" [placeholder]="'myt.descPlaceholder' | t"></textarea>
          </div>

          <!-- Attachments collected BEFORE submit -->
          <div class="form-group">
            <label>{{ 'task.attachments' | t }}</label>
            <div class="att-row">
              <label class="btn btn-ghost btn-sm att-file-btn">
                📎 {{ 'task.upload' | t }}
                <input type="file" multiple hidden (change)="pickFiles($event)" />
              </label>
              <button class="btn btn-ghost btn-sm" (click)="showLinkInput.set(!showLinkInput())">
                🔗 {{ 'task.addUrl' | t }}
              </button>
            </div>
            @if (showLinkInput()) {
              <div class="link-row mt-1">
                <input class="input" [(ngModel)]="linkTitle" [placeholder]="'task.urlTitle' | t" />
                <input class="input" [(ngModel)]="linkUrl" placeholder="https://…" />
                <button class="btn btn-ghost btn-sm" (click)="addPendingLink()">{{ 'c.add' | t }}</button>
              </div>
            }
            @for (f of pendingFiles; track $index) {
              <div class="att-chip">📎 {{ f.name }}
                <button class="att-rm" (click)="removeFile($index)">✕</button>
              </div>
            }
            @for (l of pendingLinks; track $index) {
              <div class="att-chip">🔗 {{ l.title || l.url }}
                <button class="att-rm" (click)="removeLink($index)">✕</button>
              </div>
            }
          </div>

          <div class="modal-foot">
            <button class="btn btn-ghost" (click)="closeForm()">{{ 'c.cancel' | t }}</button>
            <button class="btn btn-primary" [disabled]="submitting()" (click)="submit()">
              {{ submitting() ? ('myt.submitting' | t) : ('myt.submit' | t) }}
            </button>
          </div>

        } @else {
          <div class="success-box">
            <div class="success-icon">✅</div>
            <p>{{ 'myt.submitted' | t }}</p>
            @if (uploadingCount() > 0) {
              <p class="text-sm muted">{{ 'myt.uploading' | t }} {{ uploadingCount() }} {{ 'myt.files' | t }}</p>
            }
            @for (a of attachments(); track a.id) {
              <div class="att-chip">
                @if (a.kind === 'Link') { 🔗 } @else if (a.kind === 'Image') { 🖼 } @else { 📎 }
                {{ a.fileName }}
              </div>
            }
          </div>
          <div class="modal-foot">
            <button class="btn btn-primary" [disabled]="uploadingCount() > 0" (click)="closeForm()">
              {{ 'myt.done' | t }}
            </button>
          </div>
        }
      </div>
    </div>
  }
  `
})
export class MyTickets implements OnInit {
  private taskSvc = inject(TaskService);
  private chatSvc = inject(ChatService);
  private attSvc = inject(AttachmentService);
  i18n = inject(I18nService);

  allTickets = signal<TaskListItem[]>([]);
  loading = signal(true);
  showForm = signal(false);
  technicians = signal<AvailableTechnician[]>([]);
  attachments = signal<Attachment[]>([]);
  submitting = signal(false);
  formError = signal('');
  createdId = signal<number | null>(null);
  showLinkInput = signal(false);
  uploadingCount = signal(0);
  activeFilter = signal<EmpFilter>('all');
  private _page = signal(1);
  currentPage = this._page.asReadonly();

  search = '';
  linkTitle = '';
  linkUrl = '';
  pendingFiles: File[] = [];
  pendingLinks: { title: string; url: string }[] = [];

  readonly PAGE_SIZE = 15;

  form = { title: '', description: '', priority: 'Medium' as TaskPriority, assigneeId: null as number | null };

  filterOptions: { value: EmpFilter; labelKey: string }[] = [
    { value: 'all',       labelKey: 'myt.all' },
    { value: 'notYet',    labelKey: 'myt.notYet' },
    { value: 'open',      labelKey: 'myt.open' },
    { value: 'inProcess', labelKey: 'myt.inProcess' },
    { value: 'complete',  labelKey: 'myt.complete' },
  ];

  readonly templates = TICKET_TEMPLATES;
  ini = initials;
  lbl = (s: WorkTaskStatus) => STATUS_LABELS[s];
  prioBg = (p: TaskPriority) => PRIO_COLORS[p];

  filteredTickets = computed(() => {
    const q = this.search.toLowerCase().trim();
    const statuses = FILTER_STATUSES[this.activeFilter()];
    return this.allTickets().filter(t =>
      (!q || t.title.toLowerCase().includes(q)) &&
      (!statuses || statuses.includes(t.status))
    );
  });

  displayedTickets = computed(() => {
    const p = this._page();
    return this.filteredTickets().slice((p - 1) * this.PAGE_SIZE, p * this.PAGE_SIZE);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredTickets().length / this.PAGE_SIZE)));

  countFor(f: EmpFilter): number {
    const statuses = FILTER_STATUSES[f];
    if (!statuses) return this.allTickets().length;
    return this.allTickets().filter(t => statuses.includes(t.status)).length;
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement).tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
    if ((e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      if (!this.showForm()) this.openForm();
    }
    if (e.key === 'Escape' && this.showForm()) this.closeForm();
  }

  ngOnInit() {
    this.load();
    this.chatSvc.technicians(false).subscribe(t => this.technicians.set(t));
  }

  load() {
    this.loading.set(true);
    this.taskSvc.query({ sortBy: 'createdAt', sortDescending: true, pageSize: 1000 }).subscribe({
      next: r => { this.allTickets.set(r.items); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  setFilter(f: EmpFilter) { this.activeFilter.set(f); this._page.set(1); }
  applySearch() { this._page.set(1); }
  goPage(p: number) { this._page.set(Math.max(1, Math.min(p, this.totalPages()))); }

  openForm() {
    this.form = { title: '', description: '', priority: 'Medium', assigneeId: null };
    this.formError.set('');
    this.createdId.set(null);
    this.attachments.set([]);
    this.showLinkInput.set(false);
    this.pendingFiles = [];
    this.pendingLinks = [];
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    if (this.createdId()) this.load();
  }

  submit() {
    if (!this.form.title.trim()) { this.formError.set('Title is required.'); return; }
    if (!this.form.assigneeId) { this.formError.set('Please select a technician.'); return; }
    this.formError.set('');
    this.submitting.set(true);

    this.taskSvc.create({
      title: this.form.title,
      description: this.form.description || undefined,
      status: 'ToDo',
      priority: this.form.priority,
      type: 'ServiceRequest',
      projectId: 0,
      branchId: null,
      assigneeId: this.form.assigneeId,
      tagIds: []
    }).subscribe({
      next: task => {
        this.submitting.set(false);
        this.createdId.set(task.id);
        this.uploadPending(task.id);
      },
      error: err => {
        this.submitting.set(false);
        this.formError.set(err?.error?.title ?? 'Failed to submit ticket. Please try again.');
      }
    });
  }

  pickFiles(event: Event) {
    const input = event.target as HTMLInputElement;
    this.pendingFiles = [...this.pendingFiles, ...Array.from(input.files ?? [])];
    input.value = '';
  }

  removeFile(i: number) { this.pendingFiles = this.pendingFiles.filter((_, idx) => idx !== i); }

  addPendingLink() {
    if (!this.linkUrl.startsWith('http')) return;
    this.pendingLinks = [...this.pendingLinks, { title: this.linkTitle || this.linkUrl, url: this.linkUrl }];
    this.linkTitle = ''; this.linkUrl = ''; this.showLinkInput.set(false);
  }

  removeLink(i: number) { this.pendingLinks = this.pendingLinks.filter((_, idx) => idx !== i); }

  private uploadPending(id: number) {
    const total = this.pendingFiles.length + this.pendingLinks.length;
    if (total === 0) return;
    this.uploadingCount.set(total);

    for (const f of this.pendingFiles) {
      this.attSvc.upload(id, f).subscribe({
        next: a => {
          this.attachments.update(l => [...l, a]);
          this.uploadingCount.update(n => n - 1);
        },
        error: () => this.uploadingCount.update(n => n - 1)
      });
    }
    for (const l of this.pendingLinks) {
      this.attSvc.addLink(id, l.title, l.url).subscribe({
        next: a => {
          this.attachments.update(l => [...l, a]);
          this.uploadingCount.update(n => n - 1);
        },
        error: () => this.uploadingCount.update(n => n - 1)
      });
    }
  }
}
