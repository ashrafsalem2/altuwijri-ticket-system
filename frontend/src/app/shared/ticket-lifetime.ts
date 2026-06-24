import { Component, Input, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { lifetime } from './util';

@Component({
  selector: 'app-ticket-lifetime',
  standalone: true,
  imports: [DatePipe],
  styleUrl: './ticket-lifetime.scss',
  template: `
  @if (card) {
    <!-- Card mode: pretty full-width lifetime card -->
    @if (info().kind !== 'none') {
      <div class="lt-card" [class]="'lt-card-' + info().color">
        @if (info().kind === 'Done' || info().kind === 'Cancelled') {
          <div class="lt-card-done">
            <span class="lt-big-icon">{{ info().kind === 'Done' ? '✅' : '🚫' }}</span>
            <span class="lt-big-label">{{ info().kind === 'Done' ? 'Completed' : 'Cancelled' }}</span>
          </div>
        } @else if (info().kind === 'overdue') {
          <div class="lt-card-row">
            <span class="lt-big-icon lt-pulse">⚠️</span>
            <div class="lt-card-text">
              <span class="lt-overdue-lbl">OVERDUE</span>
              <span class="lt-big-num">{{ info().label }}</span>
              <span class="lt-sub">past due date</span>
            </div>
          </div>
          <div class="lt-bar-wrap">
            <div class="lt-bar-track"><div class="lt-bar-fill" style="width:100%"></div></div>
          </div>
          @if (dueDate) {
            <div class="lt-dates">
              @if (createdAt) { <span class="lt-date-item">📅 Created {{ createdAt | date:'mediumDate' }}</span> }
              <span class="lt-date-item lt-date-due">🔴 Due {{ dueDate | date:'mediumDate' }}</span>
            </div>
          }
        } @else {
          <div class="lt-card-row">
            <span class="lt-big-icon">⏱️</span>
            <div class="lt-card-text">
              <span class="lt-remaining-lbl">Time Remaining</span>
              <span class="lt-big-num">{{ info().label }}</span>
              <span class="lt-sub">{{ urgencyText() }}</span>
            </div>
          </div>
          <div class="lt-bar-wrap">
            <div class="lt-bar-track">
              <div class="lt-bar-fill" [style.width.%]="info().pct"></div>
            </div>
            <div class="lt-bar-labels">
              <span>Start</span><span>{{ info().pct }}% elapsed</span><span>Due</span>
            </div>
          </div>
          @if (dueDate) {
            <div class="lt-dates">
              @if (createdAt) { <span class="lt-date-item">📅 {{ createdAt | date:'mediumDate' }}</span> }
              <span class="lt-date-item lt-date-due">🏁 {{ dueDate | date:'mediumDate' }}</span>
            </div>
          }
        }
      </div>
    } @else if (showEmpty) {
      <div class="lt-card lt-card-none">
        <span class="lt-none-icon">📅</span>
        <span class="lt-none-text">No deadline set</span>
      </div>
    }
  } @else {
    <!-- Inline badge mode (used in table rows, lists) -->
    @if (info().kind !== 'none' && info().kind !== 'Done' && info().kind !== 'Cancelled') {
      <div class="lt-wrap" [class]="'lt-' + info().color" [title]="title()">
        @if (info().kind === 'overdue') {
          <span class="lt-icon">⚠</span>
          <span class="lt-text lt-overdue">{{ info().label }} late</span>
        } @else {
          <span class="lt-icon">⏱</span>
          <span class="lt-text">{{ info().label }}</span>
          <div class="lt-bar"><div class="lt-fill" [style.width.%]="info().pct"></div></div>
        }
      </div>
    } @else if (info().kind === 'none' && showEmpty) {
      <span class="lt-none">—</span>
    }
  }
  `
})
export class TicketLifetime {
  @Input() dueDate?: string | null;
  @Input() status?: string | null;
  @Input() createdAt?: string;
  @Input() startDate?: string | null;  // acceptance / start-work timestamp
  @Input() showEmpty = false;
  @Input() card = false;

  info = computed(() => lifetime(this.dueDate, this.status, this.createdAt, this.startDate));

  urgencyText = computed(() => {
    const c = this.info().color;
    if (c === 'red') return 'Critical — less than 1 working hour left!';
    if (c === 'amber') return 'Urgent — less than 1 working day left';
    if (c === 'yellow') return 'Due within 3 working days';
    return 'On track';
  });

  title = computed(() => {
    const i = this.info();
    if (i.kind === 'overdue') return `Overdue by ${i.label}`;
    if (i.kind === 'future') return `${i.label} remaining`;
    return '';
  });
}
