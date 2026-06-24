import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TagService } from '../core/services/data.services';
import { TranslatePipe } from '../core/pipes/translate.pipe';
import { Tag } from '../core/models/models';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6',
  '#ec4899', '#64748b',
];

@Component({
  selector: 'app-tag-manager',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  styleUrl: './tag-manager.scss',
  host: { '(click)': 'onHostClick($event)' },
  template: `
    <div class="tm-modal" (click)="$event.stopPropagation()">

      <!-- Header -->
      <div class="tm-header">
        <div class="tm-title-row">
          <div class="tm-title-group">
            <span class="tm-icon">🏷️</span>
            <div>
              <h3 class="tm-title">{{ 'tag.manage' | t }}</h3>
              <p class="tm-subtitle">Create labels and assign icons to categorize tickets</p>
            </div>
          </div>
          <div class="tm-header-right">
            <span class="tm-count-badge">{{ tags().length }} tags</span>
            <button class="tm-close" (click)="close.emit()">✕</button>
          </div>
        </div>
      </div>

      <!-- Body -->
      <div class="tm-body">

        <!-- Create new tag section -->
        <div class="tm-section">
          <div class="tm-section-label">New tag</div>
          <div class="tc-card">
            <div class="tc-fields">
              <div class="tc-field">
                <label>Name</label>
                <input class="tm-input" [(ngModel)]="newName" placeholder="e.g. Network issue" (keyup.enter)="create()" />
              </div>
              <div class="tc-field tc-field-sm">
                <label>Icon</label>
                <input class="tm-input" [(ngModel)]="newIcon" placeholder="🐛" maxlength="4" style="text-align:center;font-size:1.1rem" />
              </div>
            </div>

            <div class="tc-color-section">
              <label class="tc-color-lbl">Color</label>
              <div class="swatch-grid">
                @for (c of colors; track c) {
                  <button class="swatch" [style.background]="c" [class.swatch-active]="newColor === c"
                    (click)="newColor = c" [title]="c">
                    @if (newColor === c) { <span class="swatch-check">✓</span> }
                  </button>
                }
                <input type="color" class="swatch-custom" [(ngModel)]="newColor" title="Custom color" />
              </div>
            </div>

            <div class="tc-footer">
              <span class="tag-preview-pill" [style.background]="newColor">
                @if (newIcon) { <span>{{ newIcon }}</span> }
                <span>{{ newName || 'Preview' }}</span>
              </span>
              <button class="tm-btn-primary" (click)="create()" [disabled]="!newName.trim() || saving()">
                <span>+</span>
                {{ saving() ? 'Adding…' : ('c.add' | t) + ' Tag' }}
              </button>
            </div>

            @if (createError()) { <div class="tm-err">{{ createError() }}</div> }
          </div>
        </div>

        <!-- Tag list -->
        <div class="tm-section">
          <div class="tm-section-label">
            All tags
            <span class="tm-count-inline">{{ tags().length }}</span>
          </div>

          @if (tags().length === 0) {
            <div class="tm-empty">
              <span class="tm-empty-icon">🏷️</span>
              <span>{{ 'tag.noTags' | t }}</span>
            </div>
          }

          <div class="tag-cards">
            @for (tag of tags(); track tag.id) {
              <div class="tag-card" [class.tag-card-editing]="editId() === tag.id">

                @if (editId() !== tag.id) {
                  <!-- View row -->
                  <div class="tag-view">
                    <span class="tag-view-pill" [style.background]="tag.color">
                      @if (tag.icon) { <span class="tag-view-icon">{{ tag.icon }}</span> }
                      {{ tag.name }}
                    </span>
                    <div class="tag-view-actions">
                      <button class="tm-icon-btn" title="Edit" (click)="startEdit(tag)">✏️</button>
                      <button class="tm-icon-btn tm-icon-btn-danger" title="Delete" (click)="remove(tag)">🗑️</button>
                    </div>
                  </div>
                } @else {
                  <!-- Edit form -->
                  <div class="te-form">
                    <div class="te-form-header">Editing tag</div>
                    <div class="tc-fields">
                      <div class="tc-field">
                        <label>Name</label>
                        <input class="tm-input" [(ngModel)]="editName" placeholder="Tag name" />
                      </div>
                      <div class="tc-field tc-field-sm">
                        <label>Icon</label>
                        <input class="tm-input" [(ngModel)]="editIcon" placeholder="🐛" maxlength="4" style="text-align:center;font-size:1.1rem" />
                      </div>
                    </div>
                    <div class="tc-color-section">
                      <label class="tc-color-lbl">Color</label>
                      <div class="swatch-grid">
                        @for (c of colors; track c) {
                          <button class="swatch" [style.background]="c" [class.swatch-active]="editColor === c"
                            (click)="editColor = c" [title]="c">
                            @if (editColor === c) { <span class="swatch-check">✓</span> }
                          </button>
                        }
                        <input type="color" class="swatch-custom" [(ngModel)]="editColor" title="Custom color" />
                      </div>
                    </div>
                    <div class="tc-footer">
                      <span class="tag-preview-pill" [style.background]="editColor">
                        @if (editIcon) { <span>{{ editIcon }}</span> }
                        <span>{{ editName || 'Preview' }}</span>
                      </span>
                      <div class="te-actions">
                        <button class="tm-btn-ghost" (click)="cancelEdit()">{{ 'c.cancel' | t }}</button>
                        <button class="tm-btn-primary" (click)="saveEdit()" [disabled]="!editName.trim() || saving()">
                          {{ saving() ? 'Saving…' : ('c.save' | t) }}
                        </button>
                      </div>
                    </div>
                    @if (editError()) { <div class="tm-err">{{ editError() }}</div> }
                  </div>
                }

              </div>
            }
          </div>
        </div>

      </div>
    </div>
  `
})
export class TagManager implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() changed = new EventEmitter<void>();

  private tagSvc = inject(TagService);

  tags = signal<Tag[]>([]);
  saving = signal(false);
  createError = signal('');
  editError = signal('');
  editId = signal<number | null>(null);

  colors = PRESET_COLORS;
  newName = '';
  newColor = '#3b82f6';
  newIcon = '';
  editName = '';
  editColor = '#3b82f6';
  editIcon = '';

  ngOnInit() { this.load(); }

  onHostClick(_e: MouseEvent) { this.close.emit(); }

  load() { this.tagSvc.getAll().subscribe(t => this.tags.set(t)); }

  create() {
    const name = this.newName.trim();
    if (!name) return;
    this.saving.set(true); this.createError.set('');
    this.tagSvc.create(name, this.newColor, this.newIcon || undefined).subscribe({
      next: () => {
        this.saving.set(false);
        this.newName = ''; this.newIcon = ''; this.newColor = '#3b82f6';
        this.load(); this.changed.emit();
      },
      error: e => { this.saving.set(false); this.createError.set(e?.error?.title ?? 'Create failed.'); }
    });
  }

  startEdit(tag: Tag) {
    this.editId.set(tag.id);
    this.editName = tag.name;
    this.editColor = tag.color;
    this.editIcon = tag.icon ?? '';
    this.editError.set('');
  }

  cancelEdit() { this.editId.set(null); this.editError.set(''); }

  saveEdit() {
    const id = this.editId();
    const name = this.editName.trim();
    if (!id || !name) return;
    this.saving.set(true); this.editError.set('');
    this.tagSvc.update(id, name, this.editColor, this.editIcon || undefined).subscribe({
      next: () => {
        this.saving.set(false);
        this.editId.set(null);
        this.load(); this.changed.emit();
      },
      error: e => { this.saving.set(false); this.editError.set(e?.error?.title ?? 'Update failed.'); }
    });
  }

  remove(tag: Tag) {
    if (!confirm(`Delete tag "${tag.name}"?`)) return;
    this.tagSvc.delete(tag.id).subscribe({
      next: () => { this.load(); this.changed.emit(); },
      error: e => this.createError.set(e?.error?.title ?? 'Delete failed.')
    });
  }
}
