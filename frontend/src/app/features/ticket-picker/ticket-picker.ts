import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { TicketCategoryService, ProjectService, OrganizationService, AttachmentService } from '../../core/services/data.services';
import { TaskService } from '../../core/services/task.service';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { TicketCategory, Project, Branch, TaskPriority, TaskType, WorkTaskStatus } from '../../core/models/models';

@Component({
  selector: 'app-ticket-picker',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  styleUrl: './ticket-picker.scss',
  template: `
  <div class="picker-page" [attr.dir]="i18n.dir()">

    <!-- ══════════════════════════════════════
         STEP 1 — Category Grid
    ══════════════════════════════════════ -->
    @if (step() === 1) {
      <div class="picker-header">
        <button class="back-btn" (click)="goBack()">
          <span>{{ i18n.lang() === 'ar' ? '›' : '‹' }}</span>
          {{ 'pick.back' | t }}
        </button>
        <div class="picker-titles">
          <h2>{{ 'pick.title' | t }}</h2>
          <p class="picker-sub">{{ 'pick.subtitle' | t }}</p>
        </div>
      </div>

      @if (loadingCats()) {
        <div class="spin"></div>
      } @else if (!isAdmin()) {

        <!-- Employee / Technician: clean title-only list -->
        <div class="emp-cat-list">
          @for (cat of categories(); track cat.id) {
            @if (cat.isActive) {
              <button class="emp-cat-row" (click)="selectCategory(cat)"
                      [style.--cat-color]="cat.color">
                <div class="emp-cat-accent" [style.background]="cat.color"></div>
                <div class="emp-cat-icon" [style.background]="cat.color + '18'">
                  {{ cat.icon }}
                </div>
                <span class="emp-cat-name">{{ (i18n.lang() === 'ar' && cat.nameAr) ? cat.nameAr : cat.name }}</span>
                <span class="emp-cat-arrow" [style.color]="cat.color">
                  {{ i18n.lang() === 'ar' ? '‹' : '›' }}
                </span>
              </button>
            }
          }
          @if (activeCategories() === 0) {
            <div class="empty-cats">{{ 'tc.empty' | t }}</div>
          }
        </div>

      } @else {

        <!-- Admin / Tech: full detail cards -->
        <div class="cat-grid">
          @for (cat of categories(); track cat.id) {
            @if (cat.isActive) {
              <button class="cat-card" (click)="selectCategory(cat)">
                <div class="cat-strip" [style.background]="cat.color"></div>
                <div class="cat-inner">
                  <div class="cat-top">
                    <div class="cat-icon-wrap" [style.background]="cat.color + '22'">
                      <span class="cat-icon-emoji">{{ cat.icon }}</span>
                      <div class="cat-color-dot" [style.background]="cat.color"></div>
                    </div>
                    <div class="cat-meta">
                      <div class="cat-name">{{ (i18n.lang() === 'ar' && cat.nameAr) ? cat.nameAr : cat.name }}</div>
                      @if (cat.description) {
                        <div class="cat-desc">{{ cat.description }}</div>
                      }
                    </div>
                    <span class="cat-chevron" [style.color]="cat.color">
                      {{ i18n.lang() === 'ar' ? '‹' : '›' }}
                    </span>
                  </div>
                  <div class="cat-stats">
                    <div class="cat-stat">
                      <span>🎫</span>
                      <span>{{ cat.taskCount }} {{ 'tc.tasks' | t }}</span>
                    </div>
                    <div class="cat-stat">
                      <span>👥</span>
                      <span>{{ cat.technicianCount }} {{ 'tc.techs' | t }}</span>
                    </div>
                  </div>
                </div>
              </button>
            }
          }
          @if (activeCategories() === 0) {
            <div class="empty-cats">{{ 'tc.empty' | t }}</div>
          }
        </div>

      }
    }

    <!-- ══════════════════════════════════════
         STEP 2 — Create Form
    ══════════════════════════════════════ -->
    @if (step() === 2 && selectedCat()) {
      <div class="picker-header">
        <button class="back-btn" (click)="step.set(1)">
          <span>{{ i18n.lang() === 'ar' ? '›' : '‹' }}</span>
          {{ 'pick.back' | t }}
        </button>
        <div class="picker-titles">
          <div class="cat-badge-bar">
            <span class="cat-badge-pill"
                  [style.background]="selectedCat()!.color + '18'"
                  [style.border-color]="selectedCat()!.color + '55'"
                  [style.color]="selectedCat()!.color">
              {{ selectedCat()!.icon }} {{ (i18n.lang() === 'ar' && selectedCat()!.nameAr) ? selectedCat()!.nameAr : selectedCat()!.name }}
            </span>
          </div>
          <h2>{{ 'task.ticket' | t }}</h2>
        </div>
      </div>

      <div class="form-card">
        @if (error()) { <div class="err">{{ error() }}</div> }

        <!-- Title -->
        <div class="form-group">
          <label>{{ 'task.title' | t }} <span class="req">*</span></label>
          <input class="input" [(ngModel)]="form.title" [placeholder]="'myt.titlePlaceholder' | t" />
        </div>

        <!-- Description -->
        <div class="form-group">
          <label>{{ 'task.description' | t }}</label>
          <textarea class="input" rows="3" [(ngModel)]="form.description"
                    [placeholder]="'myt.descPlaceholder' | t"></textarea>
        </div>

        <!-- Priority (+ Type override for Admin/Tech) -->
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
          @if (!isEmployee()) {
            <div class="form-group">
              <label>{{ 'task.type' | t }}</label>
              <select class="input" [(ngModel)]="form.type">
                <option value="Task">{{ 'ty.Task' | t }}</option>
                <option value="Incident">{{ 'ty.Incident' | t }}</option>
                <option value="ServiceRequest">{{ 'ty.ServiceRequest' | t }}</option>
                <option value="Bug">{{ 'ty.Bug' | t }}</option>
                <option value="Maintenance">{{ 'ty.Maintenance' | t }}</option>
                <option value="Change">{{ 'ty.Change' | t }}</option>
              </select>
            </div>
          }
        </div>

        <!-- Status + Project (non-employee) -->
        @if (!isEmployee()) {
          <div class="form-row">
            <div class="form-group">
              <label>{{ 'task.status' | t }}</label>
              <select class="input" [(ngModel)]="form.status">
                <option value="Backlog">{{ 'st.Backlog' | t }}</option>
                <option value="ToDo">{{ 'st.ToDo' | t }}</option>
                <option value="InProgress">{{ 'st.InProgress' | t }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ 'task.project' | t }}</label>
              <select class="input" [(ngModel)]="form.projectId">
                @for (p of projects(); track p.id) { <option [ngValue]="p.id">{{ p.name }}</option> }
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>{{ 'org.branch' | t }}</label>
            <select class="input" [(ngModel)]="form.branchId">
              <option [ngValue]="null">— {{ 'c.none' | t }} —</option>
              @for (b of branches(); track b.id) { <option [ngValue]="b.id">{{ b.name }} ({{ b.areaName }})</option> }
            </select>
          </div>
        }

        <!-- ── Divider ── -->
        <div class="section-divider">
          <span>{{ i18n.lang() === 'ar' ? 'الملفات والروابط (اختياري)' : 'Files & Links (optional)' }}</span>
        </div>

        <!-- ── File Attachments ── -->
        <div class="form-group">
          <label>{{ 'task.attach' | t }}</label>
          <div class="attach-zone" (click)="fileInput.click()"
               (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
            <span class="attach-zone-icon">📎</span>
            <span class="attach-zone-text">
              {{ i18n.lang() === 'ar' ? 'انقر أو اسحب الملفات هنا' : 'Click or drag files here' }}
            </span>
            <span class="attach-zone-hint">
              {{ i18n.lang() === 'ar' ? 'يمكنك إرفاق أي نوع من الملفات' : 'Any file type supported' }}
            </span>
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
                  <button class="attach-remove" (click)="removeFile(f)" type="button">✕</button>
                </div>
              }
            </div>
          }
        </div>

        <!-- ── URL Links ── -->
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
              <input class="input link-url-in" [(ngModel)]="lnk.url"
                     placeholder="https://…" dir="ltr" />
              <button class="attach-remove" (click)="removeLink(i)" type="button">✕</button>
            </div>
          }
        </div>

        <!-- Upload progress -->
        @if (uploading()) {
          <div class="upload-progress">
            <div class="upload-spin"></div>
            <span>{{ 'myt.uploading' | t }} {{ pendingFiles.length + pendingLinks.length }} {{ 'myt.files' | t }}</span>
          </div>
        }

        <!-- Actions -->
        <div class="form-actions">
          <button class="btn btn-ghost" (click)="step.set(1)">{{ 'c.cancel' | t }}</button>
          <button class="btn-submit" [disabled]="submitting() || uploading()" (click)="submit()"
                  [style.background]="selectedCat()!.color">
            @if (submitting() || uploading()) {
              <span class="btn-spin"></span>
            }
            {{ (submitting() || uploading()) ? ('c.saving' | t) : ('myt.submit' | t) }}
          </button>
        </div>
      </div>
    }
  </div>
  `
})
export class TicketPicker implements OnInit {
  private router     = inject(Router);
  private catSvc     = inject(TicketCategoryService);
  private taskSvc    = inject(TaskService);
  private attachSvc  = inject(AttachmentService);
  private projectSvc = inject(ProjectService);
  private orgSvc     = inject(OrganizationService);
  private auth       = inject(AuthService);
  i18n               = inject(I18nService);

  step         = signal<1 | 2>(1);
  categories   = signal<TicketCategory[]>([]);
  selectedCat  = signal<TicketCategory | null>(null);
  loadingCats  = signal(true);
  submitting   = signal(false);
  uploading    = signal(false);
  error        = signal('');
  projects     = signal<Project[]>([]);
  branches     = signal<Branch[]>([]);

  pendingFiles: File[]                            = [];
  pendingLinks: { title: string; url: string }[]  = [];

  activeCategories = () => this.categories().filter(c => c.isActive).length;
  isEmployee       = () => this.auth.hasRole('Branch-Employee', 'HO-Employee', 'Cam-Employee');
  isAdmin          = () => this.auth.hasRole('Admin');

  form: {
    title: string; description: string;
    priority: TaskPriority; type: TaskType; status: WorkTaskStatus;
    projectId: number; branchId: number | null;
  } = { title: '', description: '', priority: 'Medium', type: 'ServiceRequest', status: 'ToDo', projectId: 0, branchId: null };

  ngOnInit() {
    this.catSvc.getAll().subscribe({
      next: c => { this.categories.set(c); this.loadingCats.set(false); },
      error: () => this.loadingCats.set(false)
    });
    if (!this.isEmployee()) {
      this.projectSvc.getAll().subscribe(p => { this.projects.set(p); if (p.length) this.form.projectId = p[0].id; });
      this.orgSvc.getBranches().subscribe(b => this.branches.set(b));
    }
  }

  selectCategory(cat: TicketCategory) {
    this.selectedCat.set(cat);
    this.form.title = '';
    this.form.description = '';
    this.form.priority = 'Medium';
    this.form.type = (cat.defaultType as TaskType) ?? 'ServiceRequest';
    this.pendingFiles = [];
    this.pendingLinks = [];
    this.error.set('');
    this.step.set(2);
  }

  goBack() {
    const empRoles = ['Branch-Employee', 'HO-Employee', 'Cam-Employee'];
    if (empRoles.includes(this.auth.user()?.role ?? '')) this.router.navigate(['/my-tickets']);
    else this.router.navigate(['/tasks']);
  }

  /* ── File helpers ── */
  onFiles(e: Event) {
    const files = (e.target as HTMLInputElement).files;
    if (files) this.pendingFiles.push(...Array.from(files));
    (e.target as HTMLInputElement).value = '';
  }
  onDrop(e: DragEvent) {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files) this.pendingFiles.push(...Array.from(files));
  }
  removeFile(f: File) { this.pendingFiles = this.pendingFiles.filter(x => x !== f); }
  formatSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  fileIcon(name: string) {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return '🖼';
    if (['pdf'].includes(ext)) return '📄';
    if (['doc','docx'].includes(ext)) return '📝';
    if (['xls','xlsx'].includes(ext)) return '📊';
    if (['zip','rar','7z'].includes(ext)) return '🗜';
    return '📎';
  }

  /* ── Link helpers ── */
  addLink()          { this.pendingLinks.push({ title: '', url: '' }); }
  removeLink(i: number) { this.pendingLinks.splice(i, 1); }

  /* ── Submit ── */
  submit() {
    if (!this.form.title.trim()) {
      this.error.set(this.i18n.lang() === 'ar' ? 'العنوان مطلوب.' : 'Title is required.');
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    const cat = this.selectedCat()!;

    this.taskSvc.create({
      title:       this.form.title.trim(),
      description: this.form.description || undefined,
      status:      this.isEmployee() ? 'ToDo'           : this.form.status,
      priority:    this.form.priority,
      type:        this.form.type,
      projectId:   this.isEmployee() ? 0                : this.form.projectId,
      branchId:    this.isEmployee() ? null             : this.form.branchId,
      categoryId:  cat.id,
      assigneeId:  null,
      tagIds:      []
    }).subscribe({
      next: task => {
        this.submitting.set(false);
        const validLinks = this.pendingLinks.filter(l => l.url.trim());
        const allUploads = [
          ...this.pendingFiles.map(f  => this.attachSvc.upload(task.id, f)),
          ...validLinks.map(l         => this.attachSvc.addLink(task.id, l.title || l.url, l.url))
        ];
        if (!allUploads.length) { this.navigate(task.id); return; }
        this.uploading.set(true);
        forkJoin(allUploads).subscribe({
          next:  () => { this.uploading.set(false); this.navigate(task.id); },
          error: () => { this.uploading.set(false); this.navigate(task.id); }
        });
      },
      error: e => {
        this.submitting.set(false);
        this.error.set(e?.error?.title ?? (this.i18n.lang() === 'ar' ? 'فشل في إرسال التذكرة.' : 'Failed to submit ticket.'));
      }
    });
  }

  private navigate(taskId: number) {
    if (this.isEmployee()) this.router.navigate(['/my-tickets']);
    else this.router.navigate(['/tasks', taskId]);
  }
}
