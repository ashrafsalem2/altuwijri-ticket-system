import { Component, input, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { elapsed } from './util';

@Component({
  selector: 'app-ticket-lifetime',
  standalone: true,
  imports: [DatePipe],
  styleUrl: './ticket-lifetime.scss',
  template: `
  @if (card()) {
    <!-- Card mode: full-width informative elapsed card -->
    <div class="lt-card" [class]="'lt-card-' + info().kind">
      @if (info().kind === 'done') {
        <div class="lt-card-done">
          <span class="lt-big-icon">✅</span>
          <div class="lt-card-text">
            <span class="lt-big-label">Completed</span>
            @if (info().label) {
              <span class="lt-big-num">{{ info().label }}</span>
              <span class="lt-sub">Total duration</span>
            }
          </div>
        </div>
      } @else if (info().kind === 'cancelled') {
        <div class="lt-card-done">
          <span class="lt-big-icon">🚫</span>
          <span class="lt-big-label">Cancelled</span>
        </div>
      } @else if (info().kind === 'running') {
        <div class="lt-card-row">
          <span class="lt-big-icon lt-pulse">⏱️</span>
          <div class="lt-card-text">
            <span class="lt-remaining-lbl">Time Elapsed</span>
            <span class="lt-big-num">{{ info().label }}</span>
            <span class="lt-sub">Since work started</span>
          </div>
        </div>
        @if (startDate()) {
          <div class="lt-dates">
            <span class="lt-date-item">🚀 Started {{ startDate() | date:'mediumDate' }}</span>
          </div>
        }
      } @else {
        <!-- pending: not started yet -->
        @if (showEmpty()) {
          <div class="lt-card-done">
            <span class="lt-big-icon">⏳</span>
            <span class="lt-big-label">Not yet started</span>
          </div>
        }
      }
    </div>
  } @else {
    <!-- Inline badge mode (table rows, lists) -->
    @if (info().kind === 'running') {
      <div class="lt-wrap lt-running" [title]="'Elapsed: ' + info().label">
        <span class="lt-icon">⏱</span>
        <span class="lt-text">{{ info().label }}</span>
      </div>
    } @else if (info().kind === 'done' && info().label) {
      <div class="lt-wrap lt-done" [title]="'Duration: ' + info().label">
        <span class="lt-icon">✓</span>
        <span class="lt-text">{{ info().label }}</span>
      </div>
    } @else if (info().kind === 'pending' && showEmpty()) {
      <span class="lt-none">—</span>
    }
  }
  `
})
export class TicketLifetime {
  startDate = input<string | null | undefined>();
  completedAt = input<string | null | undefined>();
  status = input<string | null | undefined>();
  showEmpty = input(false);
  card = input(false);

  info = computed(() => elapsed(this.startDate(), this.status(), this.completedAt()));
}
