# Altuwijri Ticket System — User Guide
# دليل المستخدم — نظام تذاكر التويجري

---

## English Section

### 1. Introduction

**Altuwijri Ticket System (ATS)** is a professional IT task and support-ticket management platform built for the Al-Tuwijri organisation's IT Department. It supports five roles, full Arabic/English switching, real-time chat, file attachments, rich reporting, and a visual Kanban board.

### 2. Roles & Permissions

| Role | What they can do |
|------|-----------------|
| **Admin** | Full access: manage users, roles, projects, areas, branches, tasks, reports, chat |
| **Manager** | Manage tasks and projects; view all reports; use chat |
| **Technician** | Create/edit/close tasks assigned to them; toggle availability; chat |
| **Viewer** | Read-only access to tasks, board, projects, reports |
| **Employee** | Submit support tickets; track own tickets; chat with technicians; view own reports |

### 3. Signing In

1. Open the application at `http://localhost:8080` (or the IIS URL configured by your IT team).
2. Enter your **Username** (or email) and **Password**.
3. Click **Sign In**.
4. To switch language between Arabic and English, click the **🌐 AR / 🌐 EN** button on the login page or in the top toolbar.

**Demo accounts (password in parentheses):**

| Username | Role | Password |
|----------|------|----------|
| admin | Admin | Admin@123 |
| mmanager | Manager | Manager@123 |
| ttech | Technician | Tech@123 |
| viewer | Viewer | Viewer@123 |
| emp1 | Employee (Downtown branch) | Emp@123 |
| emp2 | Employee (Harbor branch) | Emp@123 |

### 4. Dashboard

The **Dashboard** is the landing page after sign-in. It displays:

- **KPI cards** — Total tasks, Open, In Progress, Done, Overdue, SLA Breaches, My Tasks, Completion Rate. Click any card to jump to the filtered task list.
- **Pie charts** — Status distribution, Priority distribution, Type distribution. Click a slice to filter tasks by that value.
- **Bar charts** — Tasks by status (clickable), Tasks by priority (clickable), Completed in last 7 days, Open by project.
- **Type grid** — Task type distribution with emoji icons. Click a type cell to see tasks of that type.
- **Recent activity** — Last 15 user actions across the system.

### 5. Tasks (Task List)

Navigate to **Tasks** in the sidebar to see all tasks with filters.

**Filters available:**
- Free-text search
- Status (Backlog / To Do / In Progress / In Review / Blocked / Done / Cancelled)
- Priority (Low / Medium / High / Critical)
- Type — each type has a distinct icon: 📋 Task · 🐛 Bug · 🚨 Incident · 🎫 Service Request · ⭐ Feature · 🔧 Maintenance · 🔄 Change
- Project
- Branch
- Assignee
- Overdue only (checkbox)

**Lifetime indicator** — The Due column shows a colour-coded progress bar:
- 🟢 Green — more than 3 days remaining
- 🟡 Yellow — 1–3 days remaining
- 🟠 Amber — less than 1 day remaining
- 🔴 Red pulsing — overdue (shows "Xd late" or "Xh late")

Clicking a task title opens the **Task Detail** page.

### 6. Task Detail

The detail page shows:
- Title, status badge, priority badge, type badge with icon
- Description, tags, subtasks
- Attachments (files and URLs) with inline image preview and download
- Comments thread with time-relative timestamps
- **Meta sidebar** with all fields including a lifetime indicator at the top showing remaining time / overdue status

Admins, Managers, and Technicians can:
- Edit the task (opens modal)
- Delete the task (Admin/Manager only)
- Upload files and add URLs
- Post comments
- Click **💬 Discuss** to start a chat thread with the assignee about this ticket

### 7. Kanban Board

Available to Admin, Manager, Technician, Viewer roles. Drag tasks between status columns or click a task to view its detail. Use filters at the top to narrow by project, priority, type, or branch.

### 8. Projects

Lists all projects with task counts and completion progress. Admins and Managers can create, edit, and archive projects.

### 9. Chat

The **Support Chat** connects users and technicians.

- **Conversation list** (left panel) shows all your conversations with a presence dot:
  - 🟢 Green dot = online / available
  - ⚫ Grey dot = offline / away
  - Offline contacts have grey-tinted avatars and an "Offline" label
- **Thread** (right panel) shows the message history.
- **Delivery ticks** on your sent messages (right side):
  - ✓ grey = message delivered (sent)
  - ✓✓ green = message read by the other person
- An **offline banner** appears above the composer when the other participant is currently away.
- Click **+ New** to start a new chat — choose a technician from the list, enter a subject, and click **Start chat**.

### 10. Reports

Available for Admin, Manager, Technician, Viewer roles. Generates printable reports for:
- **Branch report** — All tasks in a specific branch with KPI summary and pie charts
- **Area report** — Aggregated statistics across all branches in an area
- **Technician report** — Performance report per technician with task completion stats
- **Date-range report** — Tasks created or completed within a date period

Click **Print** or **Ctrl+P** to print; sidebar and controls are hidden in print mode.

### 11. Employee: My Tickets

Employees see **My Tickets** instead of the full task list. This shows only their own submitted tickets.

**Submitting a new ticket:**
1. Click **+ New Ticket**
2. Select the technician who should handle it
3. Enter a title, choose priority, write a description
4. After the ticket is created, you can upload files or add URLs directly in the form
5. Click **Submit**

Each ticket shows a progress bar and priority dot. Click a ticket title to view its detail.

### 12. Employee: My Reports

Three modes:
- **All Tickets** — all your tickets with KPI summary and status/priority pie charts
- **By Period** — filter by date range
- **Single Ticket** — paste a ticket ID for a focused single-ticket report

### 13. Organization

Admins and Managers can manage the org hierarchy:
- **Areas** (top level) → each Area contains Branches
- **Branches** → each Branch can have Employees assigned to it

### 14. Users

Admins can create, edit, and deactivate user accounts. Each user is assigned a role and optionally a branch.

---

## القسم العربي

### 1. المقدمة

**نظام تذاكر التويجري (ATS)** هو منصة احترافية لإدارة مهام تقنية المعلومات وتذاكر الدعم الفني، مبنية لقسم تقنية المعلومات في مؤسسة التويجري. يدعم النظام خمسة أدوار مختلفة، وتبديل كامل بين العربية والإنجليزية، والمحادثة الفورية، ومرفقات الملفات، والتقارير الشاملة، ولوحة كانبان المرئية.

### 2. الأدوار والصلاحيات

| الدور | الصلاحيات |
|-------|-----------|
| **مسؤول (Admin)** | وصول كامل: إدارة المستخدمين والأدوار والمشاريع والمناطق والفروع والمهام والتقارير والمحادثات |
| **مدير (Manager)** | إدارة المهام والمشاريع؛ عرض جميع التقارير؛ استخدام المحادثة |
| **فني (Technician)** | إنشاء/تعديل/إغلاق المهام المسندة إليه؛ تبديل حالة التوفر؛ المحادثة |
| **مشاهد (Viewer)** | وصول للقراءة فقط: المهام واللوحة والمشاريع والتقارير |
| **موظف (Employee)** | إصدار تذاكر الدعم؛ متابعة تذاكره؛ محادثة الفنيين؛ عرض تقاريره الخاصة |

### 3. تسجيل الدخول

1. افتح التطبيق على العنوان `http://localhost:8080` (أو عنوان IIS المُعدّ من قِبَل فريق تقنية المعلومات).
2. أدخل **اسم المستخدم** (أو البريد الإلكتروني) و**كلمة المرور**.
3. انقر **تسجيل الدخول**.
4. لتبديل اللغة بين العربية والإنجليزية، انقر على زر **🌐 AR / 🌐 EN** في صفحة الدخول أو في شريط الأدوات العلوي.

**حسابات تجريبية:**

| اسم المستخدم | الدور | كلمة المرور |
|-------------|-------|------------|
| admin | مسؤول | Admin@123 |
| mmanager | مدير | Manager@123 |
| ttech | فني | Tech@123 |
| viewer | مشاهد | Viewer@123 |
| emp1 | موظف (فرع وسط المدينة) | Emp@123 |
| emp2 | موظف (فرع الميناء) | Emp@123 |

### 4. لوحة التحكم

**لوحة التحكم** هي الصفحة الرئيسية بعد تسجيل الدخول. تعرض:

- **بطاقات KPI** — إجمالي المهام، المفتوحة، قيد التنفيذ، المنجزة، المتأخرة، انتهاكات SLA، مهامي، معدل الإنجاز. انقر على أي بطاقة للانتقال إلى قائمة المهام المُفلترة.
- **المخططات الدائرية** — توزيع الحالات، توزيع الأولويات، توزيع الأنواع. انقر على شريحة للتصفية بها.
- **المخططات الشريطية** — المهام حسب الحالة (قابلة للنقر)، المهام حسب الأولوية، المنجزة في آخر 7 أيام، المفتوحة حسب المشروع.
- **شبكة الأنواع** — توزيع أنواع المهام بأيقونات تعبيرية. انقر على نوع للاطلاع على مهامه.
- **النشاط الأخير** — آخر 15 إجراء في النظام.

### 5. المهام (قائمة المهام)

انتقل إلى **المهام** في الشريط الجانبي لعرض جميع المهام مع الفلاتر.

**الفلاتر المتاحة:**
- بحث نصي حر
- الحالة (قائمة الانتظار / للتنفيذ / قيد التنفيذ / قيد المراجعة / موقوف / منجز / ملغى)
- الأولوية (منخفضة / متوسطة / عالية / حرجة)
- النوع — لكل نوع أيقونة مميزة: 📋 مهمة · 🐛 عطل · 🚨 حادثة · 🎫 طلب خدمة · ⭐ ميزة · 🔧 صيانة · 🔄 تغيير
- المشروع
- الفرع
- المسند إليه
- المتأخرة فقط (خانة اختيار)

**مؤشر العمر الافتراضي** — يعرض العمود شريطاً ملوناً لموعد الاستحقاق:
- 🟢 أخضر — أكثر من 3 أيام متبقية
- 🟡 أصفر — 1–3 أيام متبقية
- 🟠 برتقالي — أقل من يوم متبقٍ
- 🔴 أحمر وامض — متأخر (يعرض "Xي متأخر" أو "Xس متأخر")

### 6. تفاصيل المهمة

تعرض صفحة التفاصيل:
- العنوان، شارة الحالة، شارة الأولوية، شارة النوع بأيقونتها
- الوصف، الوسوم، المهام الفرعية
- المرفقات (ملفات وروابط) مع معاينة الصور وتنزيلها
- الدردشة التعليقية بطوابع زمنية نسبية
- **الشريط الجانبي** بجميع الحقول ومؤشر العمر الافتراضي في الأعلى

### 7. محادثة الدعم الفني

تربط **المحادثة** المستخدمين والفنيين.

- قائمة المحادثات (اللوحة اليسرى) تُظهر نقطة حضور:
  - نقطة خضراء = متصل / متاح
  - نقطة رمادية = غير متصل / غائب
- **علامات التسليم** على رسائلك المُرسلة:
  - ✓ رمادي = تم التسليم
  - ✓✓ أخضر = تمت القراءة
- **شريط تحذيري** يظهر فوق مربع الرسالة عندما يكون المستلم غير متصل.

### 8. موظف: تذاكري

يرى الموظف **تذاكري** بدلاً من قائمة المهام الكاملة. تعرض تذاكره المُقدَّمة فقط.

**تقديم تذكرة جديدة:**
1. انقر **+ تذكرة جديدة**
2. اختر الفني المسؤول عن المعالجة
3. أدخل العنوان، اختر الأولوية، اكتب الوصف
4. بعد إنشاء التذكرة، يمكنك رفع ملفات أو إضافة روابط
5. انقر **إرسال**

---

*نظام تذاكر التويجري — قسم تقنية المعلومات — الإصدار 2.1*
