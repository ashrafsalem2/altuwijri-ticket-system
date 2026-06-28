import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ChatService } from '../../core/services/data.services';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { AvailableTechnician, ChatMessage, Conversation } from '../../core/models/models';
import { initials, timeAgo } from '../../shared/util';

@Component({
  selector: 'app-chat',
  imports: [FormsModule, DatePipe, TranslatePipe],
  styleUrl: './chat.scss',
  template: `
  <div class="page chat-page" [attr.dir]="i18n.dir()">
    <div class="chat-layout card" [class.show-thread]="active()">
      <!-- conversation list -->
      <div class="conv-pane">
        <div class="conv-head">
          <h3>{{ 'chat.conversations' | t }}</h3>
          <button class="btn btn-sm btn-primary" (click)="openNew()">+ {{ 'chat.new' | t }}</button>
        </div>
        <div class="conv-list">
          @for (c of conversations(); track c.id) {
            <button class="conv-item" [class.on]="active()?.id === c.id" (click)="select(c)">
              <div class="conv-avatar-wrap">
                <span class="avatar" [style.background]="other(c).color || '#64748b'" [class.offline]="!other(c).available">
                  {{ ini(other(c).name) }}
                </span>
                <span class="presence-dot" [class.online]="other(c).available" [class.offline]="!other(c).available"></span>
              </div>
              <span class="conv-meta">
                <span class="conv-top">
                  <strong [class.muted]="!other(c).available">{{ other(c).name }}</strong>
                  @if (!other(c).available) { <span class="offline-lbl">{{ 'chat.offline' | t }}</span> }
                  @if (c.unreadCount > 0) { <span class="conv-badge">{{ c.unreadCount }}</span> }
                </span>
                <span class="conv-sub">{{ c.subject }}</span>
                <span class="conv-last text-xs muted">{{ c.lastMessage || ('chat.noMessages' | t) }}</span>
              </span>
              <span class="text-xs muted">{{ ago(c.lastMessageAt) }}</span>
            </button>
          } @empty { <div class="empty text-sm">{{ 'chat.empty' | t }}</div> }
        </div>
      </div>

      <!-- thread -->
      <div class="thread-pane">
        @if (active(); as c) {
          <div class="thread-head" [class.other-offline]="!other(c).available">
            <button class="btn btn-icon btn-ghost back-btn" (click)="active.set(null)">←</button>
            <div class="conv-avatar-wrap sm">
              <span class="avatar" [style.background]="other(c).color || '#64748b'" [class.offline]="!other(c).available">
                {{ ini(other(c).name) }}
              </span>
              <span class="presence-dot" [class.online]="other(c).available" [class.offline]="!other(c).available"></span>
            </div>
            <div class="th-meta">
              <strong>{{ other(c).name }}</strong>
              <span class="text-xs">
                @if (other(c).available) { <span class="online-txt">● {{ 'chat.online' | t }}</span> }
                @else { <span class="offline-txt">○ {{ 'chat.offline' | t }}</span> }
                @if (c.subject) { · {{ c.subject }} }
                @if (c.taskTitle) { · "{{ c.taskTitle }}" }
              </span>
            </div>
            <span class="spacer"></span>
            <span class="badge" [class]="c.status === 'Open' ? 'st-Done' : 'st-Cancelled'">{{ c.status }}</span>
            <button class="btn btn-sm btn-ghost" (click)="close(c)" [disabled]="c.status==='Closed'">{{ 'chat.close' | t }}</button>
          </div>

          <div class="msgs" #msgList>
            @for (m of messages(); track m.id) {
              <div class="msg" [class.mine]="m.isMine">
                @if (!m.isMine) { <span class="avatar sm" [style.background]="m.senderColor || '#64748b'">{{ ini(m.senderName) }}</span> }
                <div class="bubble">
                  <div class="msg-text">{{ m.content }}</div>
                  <div class="msg-footer text-xs">
                    <span class="msg-time">{{ m.createdAt | date:'shortTime' }}</span>
                    @if (m.isMine) {
                      <!-- WhatsApp-style ticks -->
                      <span class="msg-ticks" [class.read]="m.isRead" [title]="m.isRead ? ('chat.read' | t) : ('chat.delivered' | t)">
                        @if (m.isRead) { <span class="tick tick-r">✓</span><span class="tick tick-r">✓</span> }
                        @else { <span class="tick">✓</span> }
                      </span>
                    }
                  </div>
                </div>
              </div>
            } @empty { <div class="empty text-sm">{{ 'chat.sayHello' | t }}</div> }
          </div>

          @if (!other(c).available) {
            <div class="offline-banner">⚠ {{ 'chat.offlineBanner' | t }}</div>
          }

          <div class="composer">
            <input class="input" placeholder="{{ 'chat.placeholder' | t }}" [(ngModel)]="draft"
              (keyup.enter)="send()" [disabled]="c.status==='Closed'" />
            <button class="btn btn-primary" (click)="send()" [disabled]="!draft.trim() || c.status==='Closed'">{{ 'chat.send' | t }}</button>
          </div>
        } @else {
          <div class="empty thread-empty">{{ 'chat.selectOrNew' | t }}</div>
        }
      </div>
    </div>
  </div>

  @if (showNew()) {
    <div class="overlay" (click)="showNew.set(false)">
      <div class="modal card" (click)="$event.stopPropagation()">
        <div class="modal-head"><h3>{{ 'chat.startTitle' | t }}</h3><button class="btn btn-icon btn-ghost" (click)="showNew.set(false)">✕</button></div>
        <div class="modal-body">
          <div class="field"><label>{{ 'chat.subject' | t }}</label><input class="input" [(ngModel)]="newSubject" placeholder="{{ 'chat.subjectPlaceholder' | t }}" /></div>
          <div class="field mt-1">
            <input class="input" [(ngModel)]="techSearch" [placeholder]="'chat.searchUser' | t" />
          </div>
          <label class="text-sm muted">{{ 'chat.availTechs' | t }}</label>
          <div class="tech-list">
            @for (t of filteredTechs(); track t.id) {
              <button class="tech-item" [class.on]="selectedTech === t.id" (click)="selectedTech = t.id">
                <div class="conv-avatar-wrap">
                  <span class="avatar" [style.background]="t.avatarColor || '#64748b'" [class.offline]="!t.isAvailable">{{ ini(t.fullName) }}</span>
                  <span class="presence-dot" [class.online]="t.isAvailable" [class.offline]="!t.isAvailable"></span>
                </div>
                <span class="tech-meta">
                  <strong>{{ t.fullName }}</strong>
                  <span class="text-xs muted">{{ t.jobTitle }} @if (t.branchName) { · {{ t.branchName }} }</span>
                </span>
                <span class="avail-pill" [class.on]="t.isAvailable">{{ t.isAvailable ? ('avail.on' | t) : ('avail.off' | t) }}</span>
              </button>
            } @empty { <div class="empty text-sm">{{ 'chat.noTechs' | t }}</div> }
          </div>
          @if (error()) { <div class="err">{{ error() }}</div> }
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" (click)="showNew.set(false)">{{ 'c.cancel' | t }}</button>
          <button class="btn btn-primary" (click)="start()" [disabled]="!selectedTech">{{ 'chat.start' | t }}</button>
        </div>
      </div>
    </div>
  }
  `
})
export class Chat implements OnInit, OnDestroy {
  private chatSvc = inject(ChatService);
  private auth = inject(AuthService);
  i18n = inject(I18nService);

  conversations = signal<Conversation[]>([]);
  active = signal<Conversation | null>(null);
  messages = signal<ChatMessage[]>([]);
  technicians = signal<AvailableTechnician[]>([]);
  showNew = signal(false);
  error = signal('');
  draft = '';
  newSubject = '';
  techSearch = '';
  selectedTech?: number;

  filteredTechs = computed(() => {
    const s = this.techSearch.trim().toLowerCase();
    return s ? this.technicians().filter(t => t.fullName.toLowerCase().includes(s)) : this.technicians();
  });
  private poll?: any;

  /** Availability map: userId -> isAvailable */
  private availMap = new Map<number, boolean>();

  ini = initials; ago = timeAgo;

  ngOnInit() { this.initChat(); }
  ngOnDestroy() { clearInterval(this.poll); }

  private initChat() {
    clearInterval(this.poll);
    this.loadConversations(true);
    this.loadAvailability();
    this.poll = setInterval(() => {
      this.loadConversations(false);
      this.loadAvailability();
      if (this.active()) this.loadMessages(this.active()!.id);
    }, 5000);
  }

  private me() { return this.auth.user()?.id; }

  other(c: Conversation) {
    const isMeIssuer = c.issuerId === this.me();
    const id = isMeIssuer ? c.technicianId : c.issuerId;
    const name = isMeIssuer ? (c.technicianName ?? 'Unassigned') : c.issuerName;
    const color = isMeIssuer ? c.technicianColor : c.issuerColor;
    const available = id ? (this.availMap.get(id) ?? false) : false;
    return { name, color, available };
  }

  private loadAvailability() {
    this.chatSvc.technicians(false).subscribe(list => {
      this.availMap.clear();
      list.forEach(t => this.availMap.set(t.id, t.isAvailable));
    });
  }

  loadConversations(selectFirst = false) {
    this.chatSvc.conversations().subscribe(cs => {
      this.conversations.set(cs);
      const cur = this.active();
      if (cur) { const upd = cs.find(c => c.id === cur.id); if (upd) this.active.set(upd); }
      else if (selectFirst && cs.length) {
        // Prefer the conversation that has unread messages, fallback to most recent
        const withUnread = cs.find(c => c.unreadCount > 0);
        this.select(withUnread ?? cs[0]);
      }
    });
  }

  select(c: Conversation) { this.active.set(c); this.loadMessages(c.id); }

  loadMessages(id: number) {
    this.chatSvc.messages(id).subscribe(m => {
      this.messages.set(m);
      // Backend marks messages as read on GET; refresh badge immediately
      this.chatSvc.refreshUnread();
      setTimeout(() => { const el = document.querySelector('.msgs'); if (el) el.scrollTop = el.scrollHeight; });
    });
  }

  send() {
    const c = this.active(); const text = this.draft.trim();
    if (!c || !text) return;
    this.draft = '';
    this.chatSvc.send(c.id, text).subscribe(m => {
      this.messages.update(ms => [...ms, m]);
      setTimeout(() => { const el = document.querySelector('.msgs'); if (el) el.scrollTop = el.scrollHeight; });
      this.loadConversations(false);
    });
  }

  close(c: Conversation) { this.chatSvc.close(c.id).subscribe(() => this.loadConversations(false)); }

  openNew() {
    this.error.set(''); this.newSubject = ''; this.techSearch = ''; this.selectedTech = undefined;
    this.chatSvc.technicians(false).subscribe(t => {
      this.technicians.set(t.filter(x => x.id !== this.me()));
      t.forEach(x => this.availMap.set(x.id, x.isAvailable));
    });
    this.showNew.set(true);
  }

  start() {
    if (!this.selectedTech) return;
    this.chatSvc.start(this.selectedTech, this.newSubject || 'Support chat').subscribe({
      next: c => { this.showNew.set(false); this.loadConversations(); this.select(c); },
      error: e => this.error.set(e?.error?.title ?? 'Could not start chat.')
    });
  }
}
