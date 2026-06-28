import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { TicketCategoryService, AttachmentService } from '../../core/services/data.services';
import { TaskService } from '../../core/services/task.service';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { TicketCategory, TaskPriority, TaskType, WorkTaskStatus } from '../../core/models/models';

type ViewMode = 'list' | 'grid';

@Component({
  selector: 'app-my-tickets',
  imports: [FormsModule, TranslatePipe],
  styleUrl: './my-tickets.scss',
  template: `
  <div class="picker-page" [attr.dir]="i18n.dir()">

    <!-- ══ STEP 1: Category picker ══ -->
    @if (step() === 1) {
      <div class="pick-header">
        <div class="pick-titles">
          <h2>🎫 {{ 'myt.title' | t }}</h2>
          <p class="pick-sub">{{ i18n.lang() === 'ar' ? 'اختر نوع الطلب لفتح تذكرة جديدة' : 'Select a category to submit a new support ticket' }}</p>
        </div>
        <div class="view-toggle">
          <button class="vt-btn" [class.on]="viewMode() === 'list'" (click)="setView('list')" [title]="'List view'">
            ☰
          </button>
          <button class="vt-btn" [class.on]="viewMode() === 'grid'" (click)="setView('grid')" [title]="'Grid view'">
            ⊞
          </button>
        </div>
      </div>

      @if (loadingCats()) {
        <div class="spin"></div>
      } @else if (activeCategories() === 0) {
        <div class="empty-cats">{{ 'tc.empty' | t }}</div>
      } @else if (viewMode() === 'list') {
        <!-- List view -->
        <div class="myt-cat-list">
          @for (cat of categories(); track cat.id) {
            @if (cat.isActive) {
              <button class="myt-cat-row" (click)="selectCategory(cat)" [style.--cat-color]="cat.color">
                <div class="myt-cat-accent" [style.background]="cat.color"></div>
                <div class="myt-cat-icon" [style.background]="cat.color + '18'">{{ cat.icon }}</div>
                <div class="myt-cat-body">
                  <span class="myt-cat-name">{{ (i18n.lang() === 'ar' && cat.nameAr) ? cat.nameAr : cat.name }}</span>
                  @if (cat.description) {
                    <span class="myt-cat-desc">{{ cat.description }}</span>
                  }
                </div>
                <span class="myt-cat-arrow" [style.color]="cat.color">
                  {{ i18n.lang() === 'ar' ? '‹' : '›' }}
                </span>
              </button>
            }
          }
        </div>
      } @else {
        <!-- Grid view -->
        <div class="myt-cat-grid">
          @for (cat of categories(); track cat.id) {
            @if (cat.isActive) {
              <button class="myt-cat-card" (click)="selectCategory(cat)">
                <div class="myt-card-strip" [style.background]="cat.color"></div>
                <div class="myt-card-body">
                  <div class="myt-card-icon" [style.background]="cat.color + '20'">
                    <span>{{ cat.icon }}</span>
                  </div>
                  <div class="myt-card-name">{{ (i18n.lang() === 'ar' && cat.nameAr) ? cat.nameAr : cat.name }}</div>
                  @if (cat.description) {
                    <div class="myt-card-desc">{{ cat.description }}</div>
                  }
                  <span class="myt-card-arrow" [style.color]="cat.color">{{ i18n.lang() === 'ar' ? '‹' : '›' }}</span>
                </div>
              </button>
            }
          }
        </div>
      }
    }

    <!-- ══ STEP 2: Ticket form ══ -->
    @if (step() === 2 && selectedCat()) {
      <div class="pick-header">
        <button class="back-btn" (click)="step.set(1)">
          <span>{{ i18n.lang() === 'ar' ? '›' : '‹' }}</span>
          {{ 'pick.back' | t }}
        </button>
        <div class="pick-titles">
          <span class="cat-pill"
                [style.background]="selectedCat()!.color + '18'"
                [style.border-color]="selectedCat()!.color + '55'"
                [style.color]="selectedCat()!.color">
            {{ selectedCat()!.icon }} {{ (i18n.lang() === 'ar' && selectedCat()!.nameAr) ? selectedCat()!.nameAr : selectedCat()!.name }}
          </span>
          <h2>{{ 'task.ticket' | t }}</h2>
        </div>
      </div>

      <div class="form-card">
        @if (error()) { <div class="form-err">{{ error() }}</div> }

        <div class="form-group">
          <label>{{ 'task.title' | t }} <span class="req">*</span></label>
          <input class="input" [(ngModel)]="form.title" [placeholder]="'myt.titlePlaceholder' | t" />
        </div>

        <div class="form-group">
          <label>{{ 'task.description' | t }}</label>
          <textarea class="input" rows="3" [(ngModel)]="form.description" [placeholder]="'myt.descPlaceholder' | t"></textarea>
        </div>

        <div class="form-group">
          <label>{{ 'task.priority' | t }}</label>
          <select class="input" [(ngModel)]="form.priority">
            <option value="Low">{{ 'pr.Low' | t }}</option>
            <option value="Medium">{{ 'pr.Medium' | t }}</option>
            <option value="High">{{ 'pr.High' | t }}</option>
            <option value="Critical">{{ 'pr.Critical' | t }}</option>
          </select>
        </div>

        <!-- Divider -->
        <div class="form-divider">
          <span>{{ i18n.lang() === 'ar' ? 'الملفات والروابط (اختياري)' : 'Files & Links (optional)' }}</span>
        </div>

        <!-- File attachments -->
        <div class="form-group">
          <label>{{ 'task.attach' | t }}</label>
          <div class="attach-zone" (click)="fileInput.click()"
               (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
            <span class="attach-icon">📎</span>
            <span class="attach-text">{{ i18n.lang() === 'ar' ? 'انقر أو اسحب الملفات هنا' : 'Click or drag files here' }}</span>
            <span class="attach-hint">{{ i18n.lang() === 'ar' ? 'يمكنك إرفاق أي نوع من الملفات' : 'Any file type supported' }}</span>
          </div>
          <input #fileInput type="file" multiple style="display:none" (change)="onFiles($event)" />
          @if (pendingFiles.length > 0) {
            <div class="attach-list">
              @for (f of pendingFiles; track f.name) {
                <div class="attach-item">
                  <span class="attach-file-icon">{{ fileIcon(f.name) }}</span>
                  <div class="attach-item-info">
                    <span class="attach-name">{{ f.name }}</span>
                    <span class="attach-size">{{ formatSize(f.size) }}</span>
                  </div>
                  <button class="attach-rm" (click)="removeFile(f)" type="button">✕</button>
                </div>
              }
            </div>
          }
        </div>

        <!-- URL links -->
        <div class="form-group">
          <div class="link-header">
            <label style="margin:0">{{ 'task.addUrl' | t }}</label>
            <button class="link-add-btn" (click)="addLink()" type="button">
              ＋ {{ i18n.lang() === 'ar' ? 'رابط جديد' : 'Add link' }}
            </button>
          </div>
          @for (lnk of pendingLinks; track $index; let i = $index) {
            <div class="link-row">
              <input class="input link-title-in" [(ngModel)]="lnk.title"
                     [placeholder]="i18n.lang() === 'ar' ? 'عنوان الرابط' : 'Link title'" />
              <input class="input link-url-in" [(ngModel)]="lnk.url" placeholder="https://…" dir="ltr" />
              <button class="attach-rm" (click)="removeLink(i)" type="button">✕</button>
            </div>
          }
        </div>

        @if (uploading()) {
          <div class="upload-progress">
            <div class="upload-spin"></div>
            <span>{{ 'myt.uploading' | t }} {{ pendingFiles.length + pendingLinks.length }} {{ 'myt.files' | t }}</span>
          </div>
        }

        <div class="form-actions">
          <button class="btn-ghost" (click)="step.set(1)">{{ 'c.cancel' | t }}</button>
          <button class="btn-submit" [disabled]="submitting() || uploading()" (click)="submit()"
                  [style.background]="selectedCat()!.color">
            @if (submitting() || uploading()) { <span class="btn-spin"></span> }
            {{ (submitting() || uploading()) ? ('c.saving' | t) : ('myt.submit' | t) }}
          </button>
        </div>
      </div>
    }
  </div>
  `
})
export class MyTickets implements OnInit {
  private catSvc    = inject(TicketCategoryService);
  private taskSvc   = inject(TaskService);
  private attachSvc = inject(AttachmentService);
  private router    = inject(Router);
  private auth      = inject(AuthService);
  i18n              = inject(I18nService);

  step        = signal<1 | 2>(1);
  categories  = signal<TicketCategory[]>([]);
  selectedCat = signal<TicketCategory | null>(null);
  loadingCats = signal(true);
  submitting  = signal(false);
  uploading   = signal(false);
  error       = signal('');
  viewMode    = signal<ViewMode>('list');

  pendingFiles: File[] = [];
  pendingLinks: { title: string; url: string }[] = [];

  activeCategories = () => this.categories().filter(c => c.isActive).length;

  form: { title: string; description: string; priority: TaskPriority } =
    { title: '', description: '', priority: 'Medium' };

  ngOnInit() {
    const saved = localStorage.getItem('myt-view') as ViewMode | null;
    if (saved === 'grid' || saved === 'list') this.viewMode.set(saved);
    this.catSvc.getAll().subscribe({
      next: c => { this.categories.set(c); this.loadingCats.set(false); },
      error: () => this.loadingCats.set(false)
    });
  }

  selectCategory(cat: TicketCategory) {
    this.selectedCat.set(cat);
    this.form = { title: '', description: '', priority: 'Medium' };
    this.pendingFiles = [];
    this.pendingLinks = [];
    this.error.set('');
    this.step.set(2);
  }

  setView(m: ViewMode) {
    this.viewMode.set(m);
    localStorage.setItem('myt-view', m);
  }

  onFiles(e: Event) {
    const files = (e.target as HTMLInputElement).files;
    if (files) this.pendingFiles.push(...Array.from(files));
    (e.target as HTMLInputElement).value = '';
  }
  onDrop(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer?.files) this.pendingFiles.push(...Array.from(e.dataTransfer.files));
  }
  removeFile(f: File) { this.pendingFiles = this.pendingFiles.filter(x => x !== f); }
  addLink()           { this.pendingLinks.push({ title: '', url: '' }); }
  removeLink(i: number) { this.pendingLinks.splice(i, 1); }

  formatSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }
  fileIcon(name: string) {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return '🖼';
    if (ext === 'pdf') return '📄';
    if (['doc','docx'].includes(ext)) return '📝';
    if (['xls','xlsx'].includes(ext)) return '📊';
    if (['zip','rar','7z'].includes(ext)) return '🗜';
    return '📎';
  }

  submit() {
    const ar = this.i18n.lang() === 'ar';
    if (!this.form.title.trim()) {
      this.error.set(ar ? 'العنوان مطلوب.' : 'Title is required.');
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    const cat = this.selectedCat()!;

    this.taskSvc.create({
      title:       this.form.title.trim(),
      description: this.form.description || undefined,
      status:      'ToDo' as WorkTaskStatus,
      priority:    this.form.priority,
      type:        (cat.defaultType as TaskType) ?? 'ServiceRequest',
      projectId:   0,
      branchId:    null,
      categoryId:  cat.id,
      assigneeId:  null,
      tagIds:      []
    }).subscribe({
      next: task => {
        this.submitting.set(false);
        const uploads = [
          ...this.pendingFiles.map(f => this.attachSvc.upload(task.id, f)),
          ...this.pendingLinks.filter(l => l.url.trim()).map(l => this.attachSvc.addLink(task.id, l.title || l.url, l.url))
        ];
        if (!uploads.length) { this.router.navigate(['/tasks', task.id]); return; }
        this.uploading.set(true);
        forkJoin(uploads).subscribe({
          next:  () => { this.uploading.set(false); this.router.navigate(['/tasks', task.id]); },
          error: () => { this.uploading.set(false); this.router.navigate(['/tasks', task.id]); }
        });
      },
      error: e => {
        this.submitting.set(false);
        const ar2 = this.i18n.lang() === 'ar';
        this.error.set(e?.error?.title ?? (ar2 ? 'فشل في إرسال التذكرة.' : 'Failed to submit ticket.'));
      }
    });
  }
}
