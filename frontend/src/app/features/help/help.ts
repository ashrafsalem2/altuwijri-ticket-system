import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/services/i18n.service';
import { AuthService } from '../../core/services/auth.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

type Tab = 'all' | 'employee' | 'technician' | 'admin';

interface HelpCard {
  id: string;
  icon: string;
  role: 'employee' | 'technician' | 'admin' | 'all';
  titleEn: string;
  titleAr: string;
  steps: { en: string; ar: string; tip?: { en: string; ar: string } }[];
}

const CARDS: HelpCard[] = [
  // ── Employee ───────────────────────────────────────────────────────────────
  {
    id: 'emp-login', icon: '🔐', role: 'employee',
    titleEn: 'How to Sign In', titleAr: 'كيفية تسجيل الدخول',
    steps: [
      { en: 'Open the app in your browser and go to the login page.', ar: 'افتح التطبيق في متصفحك وانتقل إلى صفحة تسجيل الدخول.' },
      { en: 'Enter your username (or email) and password provided by IT.', ar: 'أدخل اسم المستخدم (أو البريد الإلكتروني) وكلمة المرور التي زوّدك بها قسم تقنية المعلومات.' },
      { en: 'Click "Sign In". You will land on your personal Dashboard.', ar: 'انقر "تسجيل الدخول". ستنتقل تلقائياً إلى لوحة التحكم الشخصية.' },
      { en: 'If you forget your password, contact your IT Administrator to reset it.', ar: 'إذا نسيت كلمة المرور، تواصل مع مسؤول تقنية المعلومات لإعادة تعيينها.' },
    ]
  },
  {
    id: 'emp-ticket', icon: '🎫', role: 'employee',
    titleEn: 'Submit a New Ticket', titleAr: 'إرسال تذكرة جديدة',
    steps: [
      { en: 'Click "My Tickets" in the left sidebar, then press the "+ New Ticket" button.', ar: 'انقر "تذاكري" في الشريط الجانبي الأيسر، ثم اضغط زر "+ تذكرة جديدة".' },
      { en: 'Step 1 — Choose the category that best describes your problem (e.g. "Network & Connectivity", "Software & Applications").', ar: 'الخطوة 1 — اختر التصنيف الذي يصف مشكلتك (مثل "الشبكة والاتصال"، "البرامج والتطبيقات").' },
      { en: 'Step 2 — Write a clear, short title for your issue and add a description with as much detail as possible.', ar: 'الخطوة 2 — اكتب عنواناً واضحاً وموجزاً للمشكلة وأضف وصفاً بأكبر قدر من التفاصيل.' },
      { en: 'Optionally attach files (screenshots, documents) or links to help the technician understand the issue.', ar: 'يمكنك إرفاق ملفات (لقطات شاشة، مستندات) أو روابط لمساعدة التقني على فهم المشكلة.' },
      { en: 'Set the priority (Low, Medium, High, Critical) and click "Submit Ticket".', ar: 'حدد الأولوية (منخفضة، متوسطة، عالية، حرجة) وانقر "إرسال التذكرة".' },
      { en: 'You will receive a confirmation and can track your ticket in "My Tickets".', ar: 'ستصلك تأكيد ويمكنك متابعة حالة تذكرتك في قسم "تذاكري".' },
    ]
  },
  {
    id: 'emp-track', icon: '📋', role: 'employee',
    titleEn: 'Track My Tickets', titleAr: 'متابعة تذاكري',
    steps: [
      { en: 'Go to "My Tickets" from the sidebar to see all tickets you have submitted.', ar: 'انتقل إلى "تذاكري" من الشريط الجانبي لرؤية جميع التذاكر التي أرسلتها.' },
      { en: 'Use the status filter tabs: All · Not Yet · Open · In Process · Complete.', ar: 'استخدم تبويبات الحالة: الكل · لم يبدأ · مفتوح · قيد المعالجة · مكتمل.' },
      { en: 'Click any ticket to open its detail page and see full status, assignee, comments and attachments.', ar: 'انقر أي تذكرة لفتح صفحة تفاصيلها وعرض الحالة الكاملة والمُسند إليه والتعليقات والمرفقات.' },
      { en: 'You can add comments to your ticket to provide additional information.', ar: 'يمكنك إضافة تعليقات على تذكرتك لتزويد التقني بمعلومات إضافية.' },
    ]
  },
  {
    id: 'emp-report', icon: '📊', role: 'employee',
    titleEn: 'View My Ticket Reports', titleAr: 'عرض تقارير تذاكري',
    steps: [
      { en: 'Click "My Reports" in the sidebar.', ar: 'انقر "تقاريري" في الشريط الجانبي.' },
      { en: '"All Tickets" shows summary KPIs for everything you have submitted.', ar: '"جميع التذاكر" تعرض ملخص الإحصائيات لجميع ما أرسلته.' },
      { en: '"By Period" lets you filter by date range to see a specific time window.', ar: '"حسب الفترة" تتيح لك التصفية حسب نطاق التاريخ لرؤية فترة زمنية محددة.' },
      { en: '"Single Ticket" shows the full lifecycle of one specific ticket.', ar: '"تذكرة واحدة" تعرض دورة الحياة الكاملة لتذكرة محددة.' },
    ]
  },
  // ── Technician ─────────────────────────────────────────────────────────────
  {
    id: 'tech-dash', icon: '📊', role: 'technician',
    titleEn: 'Technician Dashboard', titleAr: 'لوحة تحكم التقني',
    steps: [
      { en: 'When you log in, you land on your personal Dashboard showing tickets assigned to you.', ar: 'عند تسجيل الدخول، ستنتقل إلى لوحة التحكم الشخصية التي تعرض التذاكر المسندة إليك.' },
      { en: 'The KPI cards show: Total assigned, Not started, In Progress, and Completed.', ar: 'بطاقات KPI تعرض: إجمالي المُسندة، لم تبدأ، قيد التنفيذ، ومكتملة.' },
      { en: 'The "My Assigned Tickets" section lists your most recent tickets for quick access.', ar: 'قسم "تذاكري المُسندة" يعرض آخر التذاكر للوصول السريع.' },
    ]
  },
  {
    id: 'tech-claim', icon: '⚡', role: 'technician',
    titleEn: 'Claim & Accept a Ticket', titleAr: 'المطالبة بتذكرة وقبولها',
    steps: [
      { en: 'Open "Tasks" from the sidebar to see all unassigned tickets in your categories.', ar: 'افتح "المهام" من الشريط الجانبي لرؤية جميع التذاكر غير المُسندة في تصنيفاتك.' },
      { en: 'Click on any ticket to open its detail page.', ar: 'انقر على أي تذكرة لفتح صفحة تفاصيلها.' },
      { en: 'In the sidebar panel you will see an "Accept Ticket" banner — click it.', ar: 'في اللوحة الجانبية ستجد بانر "قبول التذكرة" — انقر عليه.' },
      { en: 'A dialog will appear asking you to confirm. Once confirmed, the ticket is assigned to you and moves to "In Progress".', ar: 'ستظهر نافذة حوار تطلب منك التأكيد. بعد التأكيد، تُسند التذكرة إليك وتنتقل إلى "قيد التنفيذ".' },
      { en: 'The system records the exact time you accepted — this feeds your KPI response time.', ar: 'يُسجّل النظام الوقت الدقيق لقبولك — وهذا يُغذّي مقياس وقت الاستجابة في تقاريرك.' },
    ]
  },
  {
    id: 'tech-update', icon: '🔄', role: 'technician',
    titleEn: 'Update Ticket Progress', titleAr: 'تحديث تقدم التذكرة',
    steps: [
      { en: 'Open your assigned ticket from the Tasks list or your Dashboard.', ar: 'افتح تذكرتك المُسندة من قائمة المهام أو لوحة التحكم.' },
      { en: 'Use the green Technician Panel on the right to update status and progress %.', ar: 'استخدم اللوحة الخضراء الخاصة بالتقني على اليمين لتحديث الحالة ونسبة التقدم %.' },
      { en: 'When work is complete, set status to "In Review" to request manager approval.', ar: 'عند اكتمال العمل، اضبط الحالة على "قيد المراجعة" لطلب موافقة المدير.' },
      { en: 'Add comments to explain what you did or to communicate with the employee.', ar: 'أضف تعليقات لشرح ما قمت به أو للتواصل مع الموظف.' },
      { en: 'Note: Only Admin/Manager can mark a ticket as "Done" or "Cancelled".', ar: 'ملاحظة: فقط المدير/المشرف يمكنه تحديد التذكرة كـ"منجزة" أو "ملغاة".' },
      { en: 'Tip: drag tickets across columns on the Kanban Board for fast status updates.', ar: 'نصيحة: اسحب التذاكر عبر الأعمدة في لوحة كانبان لتحديث الحالة بسرعة.' },
    ]
  },
  {
    id: 'tech-board', icon: '▤', role: 'technician',
    titleEn: 'Using the Kanban Board', titleAr: 'استخدام لوحة كانبان',
    steps: [
      { en: 'The Board is only available to Admin and Technician roles.', ar: 'اللوحة متاحة فقط للمدير والتقني.' },
      { en: 'Tickets are arranged in columns: Backlog · To Do · In Progress · In Review · Blocked · Done.', ar: 'التذاكر مُرتّبة في أعمدة: قائمة الانتظار · للتنفيذ · قيد التنفيذ · قيد المراجعة · محجوبة · منجزة.' },
      { en: 'Drag a ticket card from one column to another to change its status instantly.', ar: 'اسحب بطاقة التذكرة من عمود إلى آخر لتغيير حالتها فوراً.' },
      { en: 'Use the filter bar to search, filter by priority, type, or assignee.', ar: 'استخدم شريط التصفية للبحث والتصفية حسب الأولوية أو النوع أو المُسند إليه.' },
    ]
  },
  // ── Admin ──────────────────────────────────────────────────────────────────
  {
    id: 'adm-users', icon: '👥', role: 'admin',
    titleEn: 'Manage Users', titleAr: 'إدارة المستخدمين',
    steps: [
      { en: 'Go to "Users" from the sidebar. You will see a list of all users.', ar: 'انتقل إلى "المستخدمون" من الشريط الجانبي. ستجد قائمة بجميع المستخدمين.' },
      { en: 'Click "+ New User" to create a user. Fill name, email, username, password, role, department, and branch.', ar: 'انقر "+ مستخدم جديد" لإنشاء مستخدم. أدخل الاسم والبريد والمستخدم وكلمة المرور والدور والقسم والفرع.' },
      { en: 'For Technicians: assign them to one or more Ticket Categories so they see the right tickets.', ar: 'للتقنيين: عيّنهم لتصنيف تذكرة أو أكثر حتى يتمكنوا من رؤية التذاكر المناسبة.' },
      { en: 'For Cam-Employees: assign multiple branches if they work across locations.', ar: 'لموظفي الكاميرا: عيّن لهم فروعاً متعددة إذا كانوا يعملون في أكثر من موقع.' },
      { en: 'Click "Reset PW" to reset a user\'s password. Click the toggle to deactivate without deleting.', ar: 'انقر "إعادة تعيين كلمة المرور" لإعادة تعيين كلمة مرور المستخدم. انقر التبديل لإلغاء التفعيل دون حذف.' },
    ]
  },
  {
    id: 'adm-cats', icon: '🗂', role: 'admin',
    titleEn: 'Manage Ticket Categories', titleAr: 'إدارة تصنيفات التذاكر',
    steps: [
      { en: 'Go to "Ticket Categories" from the sidebar.', ar: 'انتقل إلى "تصنيفات التذاكر" من الشريط الجانبي.' },
      { en: 'Click "+ New Category" to create one. Give it a name (EN + AR), icon, color, and display order.', ar: 'انقر "+ تصنيف جديد" لإنشاء واحد. أعطه اسماً (عربي + إنجليزي)، أيقونة، لوناً، وترتيباً للعرض.' },
      { en: 'Set the "Default Ticket Type" — this type is auto-assigned when an employee picks this category.', ar: 'اضبط "نوع التذكرة الافتراضي" — يُطبَّق هذا النوع تلقائياً عندما يختار الموظف هذا التصنيف.' },
      { en: 'Toggle "Active" to show/hide the category from the ticket picker.', ar: 'استخدم مفتاح "نشط" لإظهار/إخفاء التصنيف من محدد التذاكر.' },
      { en: 'You can import categories in bulk via Excel — download the template first.', ar: 'يمكنك استيراد التصنيفات بالجملة عبر Excel — حمّل القالب أولاً.' },
    ]
  },
  {
    id: 'adm-assign', icon: '📌', role: 'admin',
    titleEn: 'Assign & Manage Tickets', titleAr: 'إسناد وإدارة التذاكر',
    steps: [
      { en: 'Open any ticket from the Tasks list or Board. Use the edit panel to change assignee, status, or priority.', ar: 'افتح أي تذكرة من قائمة المهام أو اللوحة. استخدم لوحة التحرير لتغيير المُسند إليه أو الحالة أو الأولوية.' },
      { en: 'To close a ticket: set status to "Done". Only Admin/Manager can mark tickets Done or Cancelled.', ar: 'لإغلاق تذكرة: اضبط الحالة على "منجزة". فقط المدير/المشرف يمكنه التعيين كـ"منجزة" أو "ملغاة".' },
      { en: 'Add subtasks inside a ticket for complex issues that need multiple steps.', ar: 'أضف مهاماً فرعية داخل التذكرة للمشكلات المعقدة التي تتطلب خطوات متعددة.' },
      { en: 'Use Tags to label tickets for easier filtering and reporting.', ar: 'استخدم الوسوم لتصنيف التذاكر لتسهيل التصفية وإعداد التقارير.' },
    ]
  },
  {
    id: 'adm-reports', icon: '📈', role: 'admin',
    titleEn: 'Reports & Analytics', titleAr: 'التقارير والتحليلات',
    steps: [
      { en: 'Go to "Reports" from the sidebar (Admin only).', ar: 'انتقل إلى "التقارير" من الشريط الجانبي (للمدير فقط).' },
      { en: 'Overview — organization-wide stats. By Area / Branch — geographic breakdown.', ar: 'نظرة عامة — إحصائيات على مستوى المنظمة. حسب المنطقة / الفرع — تفصيل جغرافي.' },
      { en: 'By User — ranked performance cards with response time KPIs for each technician.', ar: 'حسب المستخدم — بطاقات أداء مُرتّبة مع مقاييس وقت الاستجابة لكل تقني.' },
      { en: '👤 User Profile — deep single-user report: trends, breakdown, resolution time.', ar: '👤 ملف المستخدم — تقرير مفصل لمستخدم واحد: اتجاهات، توزيع، وقت الحل.' },
      { en: '🎫 Ticket Profile — full lifecycle of one ticket with activity log.', ar: '🎫 ملف التذكرة — دورة حياة كاملة لتذكرة واحدة مع سجل النشاط.' },
      { en: '📈 Trend — daily and monthly ticket volume chart.', ar: '📈 الاتجاه — مخطط الحجم اليومي والشهري للتذاكر.' },
      { en: '⏱ Aging / SLA — open tickets sorted by days open; rows highlighted at 3+ and 7+ days.', ar: '⏱ التقادم / SLA — التذاكر المفتوحة مرتّبة حسب أيام الفتح؛ تُميّز الصفوف عند 3+ و 7+ أيام.' },
      { en: 'Click 🖨 Print to print or save any report as PDF.', ar: 'انقر 🖨 طباعة لطباعة أي تقرير أو حفظه كـ PDF.' },
    ]
  },
  {
    id: 'adm-org', icon: '🏢', role: 'admin',
    titleEn: 'Organization Management', titleAr: 'إدارة المنظمة',
    steps: [
      { en: 'Go to "Organization" from the sidebar to manage Areas, Branches, and Devices.', ar: 'انتقل إلى "المنظمة" من الشريط الجانبي لإدارة المناطق والفروع والأجهزة.' },
      { en: 'Areas contain Branches. Each Branch can have multiple employees assigned to it.', ar: 'المناطق تحتوي على فروع. يمكن تعيين موظفين متعددين لكل فرع.' },
      { en: 'Register Devices (computers) per branch with AnyDesk ID for quick remote support.', ar: 'سجّل الأجهزة (الحواسيب) لكل فرع مع معرّف AnyDesk للدعم عن بُعد السريع.' },
    ]
  },
  // ── All roles ──────────────────────────────────────────────────────────────
  {
    id: 'all-chat', icon: '💬', role: 'all',
    titleEn: 'Support Chat', titleAr: 'الدردشة الداعمة',
    steps: [
      { en: 'Click "Chat" in the sidebar to open the support chat.', ar: 'انقر "الدردشة" في الشريط الجانبي لفتح دردشة الدعم.' },
      { en: 'Start a new conversation by clicking "+ New". A conversation can be linked to a specific ticket.', ar: 'ابدأ محادثة جديدة بالنقر على "+ جديد". يمكن ربط المحادثة بتذكرة محددة.' },
      { en: 'All online technicians and admins will be able to see and respond to your message.', ar: 'جميع التقنيين والمدراء المتصلين سيتمكنون من رؤية رسالتك والرد عليها.' },
    ]
  },
  {
    id: 'all-lang', icon: '🌐', role: 'all',
    titleEn: 'Language & Theme', titleAr: 'اللغة والمظهر',
    steps: [
      { en: 'Click the 🌐 globe button in the top bar to switch between Arabic and English.', ar: 'انقر زر 🌐 الكرة الأرضية في الشريط العلوي للتبديل بين العربية والإنجليزية.' },
      { en: 'Click the 🌙 moon / ☀️ sun button to toggle between Dark and Light mode.', ar: 'انقر زر 🌙 القمر / ☀️ الشمس للتبديل بين الوضع الداكن والفاتح.' },
    ]
  },
];

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  styleUrl: './help.scss',
  template: `
  <div class="help-page" [attr.dir]="i18n.dir()">

    <!-- ── Hero ── -->
    <div class="help-hero">
      <div class="hero-left">
        <h1>{{ 'help.title' | t }}</h1>
        <p>{{ 'help.subtitle' | t }}</p>
        <div class="search-wrap">
          <input class="help-search" [(ngModel)]="search"
                 [placeholder]="'help.search' | t" />
          @if (search) { <button class="clr-btn" (click)="search = ''">✕</button> }
        </div>
      </div>
      <!-- Cartoon guide character -->
      <div class="hero-right">
        <div class="guide-scene">
          <svg class="guide-char" viewBox="0 0 120 200" xmlns="http://www.w3.org/2000/svg">
            <!-- Body -->
            <rect x="30" y="90" width="60" height="75" rx="18" fill="#3b82f6"/>
            <!-- Shirt detail -->
            <rect x="50" y="100" width="20" height="3" rx="2" fill="rgba(255,255,255,.35)"/>
            <rect x="50" y="107" width="20" height="3" rx="2" fill="rgba(255,255,255,.35)"/>
            <!-- Left arm (wave) -->
            <g class="arm-wave">
              <rect x="10" y="92" width="22" height="11" rx="7" fill="#3b82f6" transform="rotate(-30 21 97)"/>
              <!-- Hand -->
              <circle cx="5" cy="78" r="8" fill="#fde68a"/>
              <text x="2" y="82" font-size="10">✋</text>
            </g>
            <!-- Right arm -->
            <rect x="88" y="92" width="22" height="11" rx="7" fill="#3b82f6" transform="rotate(15 99 97)"/>
            <circle cx="112" cy="105" r="8" fill="#fde68a"/>
            <!-- Legs -->
            <rect x="38" y="160" width="18" height="32" rx="9" fill="#1e40af"/>
            <rect x="64" y="160" width="18" height="32" rx="9" fill="#1e40af"/>
            <!-- Shoes -->
            <ellipse cx="47" cy="193" rx="14" ry="7" fill="#1e3a8a"/>
            <ellipse cx="73" cy="193" rx="14" ry="7" fill="#1e3a8a"/>
            <!-- Head -->
            <circle cx="60" cy="60" r="34" fill="#fde68a"/>
            <!-- Hair -->
            <path d="M 26 52 Q 60 15 94 52" fill="#1e293b" stroke="none"/>
            <!-- Eyes -->
            <circle cx="46" cy="58" r="6" fill="white"/>
            <circle cx="74" cy="58" r="6" fill="white"/>
            <circle cx="48" cy="59" r="3.5" fill="#1e293b" class="eye-l"/>
            <circle cx="76" cy="59" r="3.5" fill="#1e293b" class="eye-r"/>
            <!-- Pupils shine -->
            <circle cx="49" cy="57" r="1" fill="white"/>
            <circle cx="77" cy="57" r="1" fill="white"/>
            <!-- Smile -->
            <path d="M 44 70 Q 60 84 76 70" stroke="#e07b39" stroke-width="3" fill="none" stroke-linecap="round"/>
            <!-- Badge -->
            <rect x="35" y="110" width="50" height="22" rx="5" fill="white" opacity=".9"/>
            <text x="60" y="126" text-anchor="middle" font-size="8.5" font-weight="700" fill="#3b82f6">IT SUPPORT</text>
          </svg>

          <!-- Speech bubble -->
          <div class="speech-bubble">
            @if (i18n.lang() === 'ar') {
              <span>مرحباً! أنا هنا لمساعدتك 👋</span>
            } @else {
              <span>Hi there! I'm here to help 👋</span>
            }
          </div>
        </div>
      </div>
    </div>

    <!-- ── Admin tab bar ── -->
    @if (isAdmin()) {
      <div class="tab-bar">
        <button class="tab-btn"           [class.on]="adminTab() === 'all'"        (click)="adminTab.set('all')">
          {{ i18n.lang() === 'ar' ? '🌐 الجميع' : '🌐 All' }}
        </button>
        <button class="tab-btn tab-emp"   [class.on]="adminTab() === 'employee'"   (click)="adminTab.set('employee')">
          👷 {{ i18n.lang() === 'ar' ? 'الموظف' : 'Employee' }}
        </button>
        <button class="tab-btn tab-tech"  [class.on]="adminTab() === 'technician'" (click)="adminTab.set('technician')">
          🔧 {{ i18n.lang() === 'ar' ? 'التقني' : 'Technician' }}
        </button>
        <button class="tab-btn tab-adm"   [class.on]="adminTab() === 'admin'"      (click)="adminTab.set('admin')">
          👑 {{ i18n.lang() === 'ar' ? 'المدير' : 'Admin' }}
        </button>
      </div>
    }

    <!-- ── Cards grid ── -->
    @if (filtered().length === 0) {
      <div class="no-results">{{ 'help.noResults' | t }}</div>
    }

    <div class="cards-grid">
      @for (card of filtered(); track card.id; let i = $index) {
        <div class="hcard" [class]="'hcard-' + card.role" [style.animation-delay]="(i * 60) + 'ms'">
          <div class="hcard-head">
            <span class="hcard-icon">{{ card.icon }}</span>
            <h3>{{ i18n.lang() === 'ar' ? card.titleAr : card.titleEn }}</h3>
            @if (isAdmin()) {
              <span class="role-chip" [class]="'rc-' + card.role">{{ roleLabel(card.role) }}</span>
            }
          </div>
          <ol class="steps">
            @for (step of card.steps; track $index) {
              <li class="step-item">
                <div class="step-num">{{ $index + 1 }}</div>
                <div class="step-text">{{ i18n.lang() === 'ar' ? step.ar : step.en }}</div>
              </li>
            }
          </ol>
        </div>
      }
    </div>

    <!-- ── Quick Reference table ── -->
    <div class="quick-ref">
      <h2>{{ i18n.lang() === 'ar' ? 'مرجع سريع — لوحة المفاتيح والاختصارات' : 'Quick Reference — Keyboard Shortcuts' }}</h2>
      <table class="ref-table">
        <thead><tr><th>{{ i18n.lang() === 'ar' ? 'المفتاح' : 'Key' }}</th><th>{{ i18n.lang() === 'ar' ? 'الإجراء' : 'Action' }}</th></tr></thead>
        <tbody>
          <tr><td><kbd>N</kbd></td><td>{{ i18n.lang() === 'ar' ? 'إنشاء تذكرة جديدة (في صفحة "تذاكري")' : 'Create new ticket (on My Tickets page)' }}</td></tr>
          <tr><td><kbd>Esc</kbd></td><td>{{ i18n.lang() === 'ar' ? 'إغلاق النوافذ / الأشكال المنبثقة' : 'Close modals / pop-ups' }}</td></tr>
          <tr><td><kbd>🌐</kbd></td><td>{{ i18n.lang() === 'ar' ? 'تبديل اللغة (العربية / الإنجليزية)' : 'Toggle language (Arabic / English)' }}</td></tr>
          <tr><td><kbd>🌙/☀</kbd></td><td>{{ i18n.lang() === 'ar' ? 'تبديل المظهر (داكن / فاتح)' : 'Toggle theme (Dark / Light)' }}</td></tr>
        </tbody>
      </table>
    </div>

    <!-- ── Ticket Status visual legend ── -->
    <div class="status-legend">
      <h2>{{ i18n.lang() === 'ar' ? 'معنى حالات التذكرة' : 'Ticket Status Meanings' }}</h2>
      <div class="sl-grid">
        @for (s of statuses; track s.key) {
          <div class="sl-item">
            <span class="sl-dot" [style.background]="s.color"></span>
            <strong>{{ s.key }}</strong>
            <span class="sl-desc">{{ i18n.lang() === 'ar' ? s.ar : s.en }}</span>
          </div>
        }
      </div>
    </div>
  </div>
  `
})
export class Help {
  i18n = inject(I18nService);
  private auth = inject(AuthService);

  search = '';
  adminTab = signal<Tab>('all');

  private currentRole = computed<Tab>(() => {
    const r = this.auth.role();
    if (r === 'Admin') return 'admin';
    if (r === 'Technician') return 'technician';
    return 'employee';
  });

  readonly statuses = [
    { key: 'Backlog',    color: '#94a3b8', en: 'Waiting to be picked up',          ar: 'في قائمة الانتظار' },
    { key: 'To Do',      color: '#6366f1', en: 'Scheduled, not started yet',        ar: 'مجدولة، لم تبدأ بعد' },
    { key: 'In Progress',color: '#2563eb', en: 'Technician is actively working',    ar: 'التقني يعمل عليها الآن' },
    { key: 'In Review',  color: '#eab308', en: 'Submitted for manager approval',    ar: 'معروضة على المدير للموافقة' },
    { key: 'Blocked',    color: '#dc2626', en: 'Waiting on external factor',        ar: 'في انتظار عامل خارجي' },
    { key: 'Done',       color: '#16a34a', en: 'Resolved and closed',               ar: 'محلولة ومغلقة' },
    { key: 'Cancelled',  color: '#cbd5e1', en: 'Cancelled — will not be resolved',  ar: 'ملغاة — لن تُعالج' },
  ];

  isAdmin = computed(() => this.auth.role() === 'Admin');

  filtered = computed(() => {
    const q = this.search.toLowerCase().trim();
    const admin = this.isAdmin();
    const role = this.currentRole();
    const tab = this.adminTab();
    return CARDS.filter(c => {
      if (admin) {
        // Admin: filter by selected tab (all = show everything)
        if (tab !== 'all' && c.role !== tab && c.role !== 'all') return false;
      } else {
        // Other roles: only their own cards + universal 'all' cards
        if (c.role !== role && c.role !== 'all') return false;
      }
      if (!q) return true;
      const haystack = (c.titleEn + c.titleAr + c.steps.map(s => s.en + s.ar).join(' ')).toLowerCase();
      return haystack.includes(q);
    });
  });

  roleLabel(role: string): string {
    const ar = this.i18n.lang() === 'ar';
    if (role === 'employee')   return ar ? '👷 موظف' : '👷 Employee';
    if (role === 'technician') return ar ? '🔧 تقني' : '🔧 Technician';
    if (role === 'admin')      return ar ? '👑 مدير' : '👑 Admin';
    return ar ? '🌐 الجميع' : '🌐 All';
  }

}
