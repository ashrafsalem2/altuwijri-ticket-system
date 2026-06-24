import {
  Component, Input, Output, EventEmitter, inject, signal, computed, HostListener, ElementRef
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Tag } from '../core/models/models';
import { TagService } from '../core/services/data.services';

@Component({
  selector: 'app-tag-picker',
  standalone: true,
  imports: [FormsModule],
  styleUrl: './tag-picker.scss',
  template: `
  <div class="tp-root">
    <!-- Selected chips -->
    <div class="tp-chips" (click)="inputEl.focus()">
      @for (t of selectedTags(); track t.id) {
        <span class="tp-chip" [style.background]="t.color" [style.border-color]="t.color">
          {{ t.name }}
          <button type="button" class="tp-x" (click)="deselect(t.id); $event.stopPropagation()">×</button>
        </span>
      }
      <input #inputEl class="tp-input" [(ngModel)]="search" (input)="open.set(true)" (focus)="open.set(true)"
        [placeholder]="selectedTags().length ? '' : 'Add tags…'" autocomplete="off" />
    </div>

    <!-- Dropdown -->
    @if (open() && (filtered().length || search.trim())) {
      <div class="tp-drop">
        @for (t of filtered(); track t.id) {
          <button type="button" class="tp-opt" [class.sel]="selectedIds().has(t.id)" (click)="toggle(t)">
            <span class="tp-dot" [style.background]="t.color"></span>
            <span>{{ t.name }}</span>
            @if (selectedIds().has(t.id)) { <span class="tp-chk">✓</span> }
          </button>
        }
        @if (search.trim() && !exactMatch()) {
          <button type="button" class="tp-opt tp-add" (click)="createTag()">
            <span class="tp-dot" [style.background]="newColor"></span>
            <span>Add <strong>"{{ search.trim() }}"</strong></span>
          </button>
        }
        @if (!filtered().length && !search.trim()) {
          <div class="tp-none">No tags yet</div>
        }
      </div>
    }
  </div>
  `
})
export class TagPicker {
  private tagSvc = inject(TagService);
  private elRef = inject(ElementRef);

  @Input() allTags: Tag[] = [];
  @Input() set selectedTagIds(ids: number[]) { this._selectedIds.set(new Set(ids)); }
  @Output() selectionChange = new EventEmitter<number[]>();
  @Output() tagsRefresh = new EventEmitter<void>();

  search = '';
  open = signal(false);
  private _selectedIds = signal(new Set<number>());
  selectedIds = this._selectedIds.asReadonly();
  newColor = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');

  selectedTags = computed(() => this.allTags.filter(t => this._selectedIds().has(t.id)));

  filtered = computed(() => {
    const s = this.search.trim().toLowerCase();
    const ids = this._selectedIds();
    return this.allTags.filter(t => !s || t.name.toLowerCase().includes(s));
  });

  exactMatch = computed(() =>
    this.allTags.some(t => t.name.toLowerCase() === this.search.trim().toLowerCase())
  );

  toggle(tag: Tag) {
    const s = new Set(this._selectedIds());
    s.has(tag.id) ? s.delete(tag.id) : s.add(tag.id);
    this._selectedIds.set(s);
    this.search = '';
    this.selectionChange.emit([...s]);
  }

  deselect(id: number) {
    const s = new Set(this._selectedIds());
    s.delete(id);
    this._selectedIds.set(s);
    this.selectionChange.emit([...s]);
  }

  createTag() {
    const name = this.search.trim();
    if (!name) return;
    this.tagSvc.create(name, this.newColor).subscribe(tag => {
      this.tagsRefresh.emit();
      const s = new Set(this._selectedIds());
      s.add(tag.id);
      this._selectedIds.set(s);
      this.selectionChange.emit([...s]);
      this.search = '';
      this.newColor = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
    });
  }

  @HostListener('document:click', ['$event'])
  onOutsideClick(e: MouseEvent) {
    if (!this.elRef.nativeElement.contains(e.target)) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape() { this.open.set(false); }
}
