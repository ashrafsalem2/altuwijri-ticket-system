import { Component, inject } from '@angular/core';
import { ConfirmService } from '../../core/services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  styleUrl: './confirm-dialog.scss',
  template: `
  @if (svc.state(); as s) {
    <div class="overlay" (click)="svc.respond(false)">
      <div class="modal card confirm-modal" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <div class="confirm-icon" [class.confirm-icon-danger]="s.variant === 'danger'">{{ s.icon }}</div>
          <button class="btn btn-icon btn-ghost" (click)="svc.respond(false)">✕</button>
        </div>
        <div class="modal-body">
          <h3>{{ s.title }}</h3>
          <p class="confirm-text">{{ s.message }}</p>
          @if (s.detail) { <div class="confirm-detail" dir="auto">{{ s.detail }}</div> }
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" (click)="svc.respond(false)">{{ s.cancelLabel }}</button>
          <button class="btn" [class.btn-danger]="s.variant === 'danger'" [class.btn-primary]="s.variant !== 'danger'"
            (click)="svc.respond(true)">{{ s.confirmLabel }}</button>
        </div>
      </div>
    </div>
  }
  `
})
export class ConfirmDialog {
  svc = inject(ConfirmService);
}
