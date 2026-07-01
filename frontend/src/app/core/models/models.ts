// ---- Enums (mirrors backend, serialized as strings) ----
export type WorkTaskStatus =
  | 'Backlog' | 'ToDo' | 'InProgress' | 'InReview' | 'Blocked' | 'Done' | 'Cancelled';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TaskType =
  | 'Task' | 'Bug' | 'Incident' | 'ServiceRequest' | 'Feature' | 'Maintenance' | 'Change';
export type ProjectStatus = 'Planning' | 'Active' | 'OnHold' | 'Completed' | 'Archived';
export type NotificationType =
  | 'TaskAssigned' | 'TaskUpdated' | 'TaskCommented' | 'TaskStatusChanged'
  | 'TaskDueSoon' | 'TaskOverdue' | 'Mention' | 'System';

export const TASK_STATUSES: WorkTaskStatus[] =
  ['Backlog', 'ToDo', 'InProgress', 'InReview', 'Blocked', 'Done', 'Cancelled'];
export const BOARD_COLUMNS: WorkTaskStatus[] =
  ['Backlog', 'ToDo', 'InProgress', 'InReview', 'Blocked', 'Done'];
export const PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Critical'];
export const TASK_TYPES: TaskType[] =
  ['Task', 'Bug', 'Incident', 'ServiceRequest', 'Feature', 'Maintenance', 'Change'];
export const PROJECT_STATUSES: ProjectStatus[] =
  ['Planning', 'Active', 'OnHold', 'Completed', 'Archived'];

export const STATUS_LABELS: Record<WorkTaskStatus, string> = {
  Backlog: 'Backlog', ToDo: 'To Do', InProgress: 'In Progress', InReview: 'In Review',
  Blocked: 'Blocked', Done: 'Done', Cancelled: 'Cancelled'
};
export const TYPE_LABELS: Record<TaskType, string> = {
  Task: 'Task', Bug: 'Bug', Incident: 'Incident', ServiceRequest: 'Service Request',
  Feature: 'Feature', Maintenance: 'Maintenance', Change: 'Change'
};

export type AttachmentKind = 'File' | 'Image' | 'Link';
export type ChatStatus = 'Open' | 'Closed';

// ---- Auth ----
export interface AuthUser {
  id: number; userName: string; fullName: string; email: string;
  role: string; avatarColor?: string; jobTitle?: string;
  branchId?: number; branchName?: string; isAvailable: boolean;
}
export interface AuthResponse {
  accessToken: string; refreshToken: string; expiresAt: string; user: AuthUser;
}

// ---- Tags ----
export interface Tag { id: number; name: string; color: string; icon?: string; }

// ---- Ticket Categories ----
export interface TicketCategory {
  id: number; name: string; nameAr?: string; description?: string; icon: string; color: string;
  displayOrder: number; isActive: boolean; taskCount: number; technicianCount: number;
  defaultType?: string;
}
export interface SaveTicketCategoryRequest {
  name: string; nameAr?: string; description?: string; icon: string; color: string;
  displayOrder: number; isActive: boolean; defaultType?: string;
}

// ---- Tasks ----
export interface TaskListItem {
  id: number; title: string; status: WorkTaskStatus; priority: TaskPriority; type: TaskType;
  progress: number; boardOrder: number; startDate?: string;
  projectId: number; projectName: string; projectColor: string;
  branchId?: number; branchName?: string;
  categoryId?: number; categoryName?: string; categoryIcon?: string; categoryColor?: string;
  assigneeId?: number; assigneeName?: string; assigneeColor?: string;
  subTaskCount: number; commentCount: number; tags: Tag[];
  createdAt: string;
}
export interface TaskDetail {
  id: number; title: string; description?: string;
  status: WorkTaskStatus; priority: TaskPriority; type: TaskType;
  startDate?: string; completedAt?: string; claimedAt?: string; progress: number;
  projectId: number; projectName: string;
  branchId?: number; branchName?: string;
  categoryId?: number; categoryName?: string; categoryIcon?: string; categoryColor?: string;
  assigneeId?: number; assigneeName?: string;
  reporterId?: number; reporterName?: string;
  parentTaskId?: number; parentTaskTitle?: string;
  tags: Tag[]; subTasks: TaskListItem[]; createdAt: string; updatedAt?: string;
}
export interface CreateTaskRequest {
  title: string; description?: string; status: WorkTaskStatus; priority: TaskPriority;
  type: TaskType; projectId: number; branchId?: number | null;
  categoryId?: number | null; assigneeId?: number | null;
  parentTaskId?: number | null; tagIds?: number[];
}
export interface UpdateTaskRequest {
  title: string; description?: string; status: WorkTaskStatus; priority: TaskPriority;
  type: TaskType; projectId: number; branchId?: number | null;
  categoryId?: number | null; assigneeId?: number | null;
  progress: number; tagIds?: number[];
}
export interface PagedResult<T> {
  items: T[]; totalCount: number; page: number; pageSize: number;
  totalPages: number; hasPrevious: boolean; hasNext: boolean;
}

// ---- Projects ----
export interface Project {
  id: number; name: string; code: string; description?: string; color: string;
  status: ProjectStatus; startDate?: string; endDate?: string;
  leadId?: number; leadName?: string; taskCount: number; completedTaskCount: number; createdAt: string;
}

// ---- Departments ----
export interface Department { id: number; name: string; code?: string; description?: string; userCount: number; }

// ---- Users ----
export interface Role { id: number; name: string; description?: string; }
export interface User {
  id: number; userName: string; email: string; fullName: string;
  jobTitle?: string; departmentId?: number; departmentName?: string; phoneNumber?: string; avatarColor?: string;
  isActive: boolean; isAvailable: boolean; roleId: number; roleName: string;
  branchId?: number; branchName?: string; areaName?: string;
  categoryIds: number[]; categoryNames: string[];
  branchIds: number[]; branchNames: string[];
  lastLoginAt?: string; createdAt: string;
}

// ---- App Links ----
export interface AppLink { id: number; title: string; url: string; icon: string; imageUrl?: string; bgColor: string; displayOrder: number; isActive: boolean; allowedRoles: string; }

// ---- Guidelines ----
export interface Guideline { id: number; title: string; body: string; displayOrder: number; isActive: boolean; }

// ---- Branch public (no device passwords) ----
export interface DevicePublic { id: number; label: string; anyDeskNumber: string; userName: string; password: string; }
export interface BranchPublic { id: number; name: string; code: string; address?: string; phone?: string; email?: string; areaName: string; devices: DevicePublic[]; }

// ---- Organization ----
export interface Area { id: number; name: string; code: string; description?: string; branchCount: number; }
export interface Device {
  id: number; branchId: number; label: string;
  anyDeskNumber: string; userName: string; password: string; notes?: string;
}
export interface Branch {
  id: number; name: string; code: string; address?: string; phone?: string; email?: string;
  areaId: number; areaName: string; userCount: number; devices: Device[];
}

// ---- Attachments ----
export interface Attachment {
  id: number; kind: AttachmentKind; fileName: string; contentType?: string;
  sizeBytes: number; url?: string; taskId: number; createdAt: string;
}

// ---- Chat ----
export interface AvailableTechnician {
  id: number; fullName: string; jobTitle?: string; avatarColor?: string;
  branchName?: string; isAvailable: boolean;
}
export interface Conversation {
  id: number; subject: string; status: ChatStatus;
  issuerId: number; issuerName: string; issuerColor?: string;
  technicianId?: number; technicianName?: string; technicianColor?: string;
  taskId?: number; taskTitle?: string;
  createdAt: string; lastMessageAt: string; lastMessage?: string; unreadCount: number;
}
export interface ChatMessage {
  id: number; conversationId: number; senderId: number; senderName: string;
  senderColor?: string; content: string; createdAt: string; isMine: boolean;
  isRead?: boolean;
}

// ---- Reports ----
export interface ReportStats {
  total: number; open: number; inProgress: number; completed: number;
  unassigned: number; completionRate: number;
}
export interface ReportBreakdown {
  byStatus: CountByLabel[]; byPriority: CountByLabel[]; byType: CountByLabel[]; byAssignee: CountByLabel[];
}
export interface BranchReport {
  branchId: number; branchName: string; branchCode: string; areaName: string;
  generatedAt: string; stats: ReportStats; breakdown: ReportBreakdown; tasks: TaskListItem[];
}
export interface BranchSummary { branchId: number; branchName: string; branchCode: string; stats: ReportStats; }
export interface AreaReport {
  areaId: number; areaName: string; areaCode: string;
  generatedAt: string; stats: ReportStats; breakdown: ReportBreakdown; branches: BranchSummary[];
}
export interface AreaSummary { areaId: number; areaName: string; areaCode: string; branchCount: number; stats: ReportStats; }
export interface OverviewReport {
  generatedAt: string; stats: ReportStats; breakdown: ReportBreakdown; areas: AreaSummary[];
}
export interface EmployeeTicketReport {
  userId: number; fullName: string; branchName?: string;
  generatedAt: string; from?: string; to?: string;
  stats: ReportStats; breakdown: ReportBreakdown; tickets: TaskListItem[];
}
export interface TagReportRow {
  tagId: number; tagName: string; tagColor: string; tagIcon?: string; stats: ReportStats;
}
export interface ByTagReport { generatedAt: string; tags: TagReportRow[]; }
export interface UserReportRow {
  userId: number; fullName: string; jobTitle?: string; roleName?: string; stats: ReportStats;
  avgResponseMinutes?: number; fastestResponseMinutes?: number; slowestResponseMinutes?: number;
}
export interface ByUserReport { generatedAt: string; users: UserReportRow[]; }
export interface GroupReportRow {
  categoryId: number; categoryName: string; categoryIcon: string; categoryColor: string;
  technicianCount: number; stats: ReportStats;
}
export interface ByGroupReport { generatedAt: string; groups: GroupReportRow[]; }

export interface DepartmentReportRow {
  departmentId: number; departmentName: string; departmentCode?: string;
  userCount: number; stats: ReportStats; users: UserReportRow[];
}
export interface ByDepartmentReport { generatedAt: string; departments: DepartmentReportRow[]; }

export interface ActivityLogRow {
  id: number; action: string; field?: string; oldValue?: string; newValue?: string;
  userName?: string; createdAt: string;
}
export interface SingleTaskReport {
  taskId: number; title: string; description?: string;
  status: string; priority: string; type: string;
  assigneeName?: string; reporterName?: string;
  projectName?: string; branchName?: string;
  categoryName?: string; categoryColor?: string; categoryIcon?: string;
  createdAt: string; startDate?: string; claimedAt?: string; completedAt?: string;
  minutesToClaim?: number; minutesToResolve?: number;
  subtaskCount: number; completedSubtaskCount: number; commentCount: number; attachmentCount: number;
  tags: string;
  subtasks: TaskListItem[];
  activity: ActivityLogRow[];
}
export interface SingleUserReport {
  userId: number; fullName: string; jobTitle?: string; roleName?: string; branchName?: string;
  generatedAt: string;
  assignedStats: ReportStats;
  submittedStats: ReportStats;
  avgResponseMinutes?: number; fastestResponseMinutes?: number; slowestResponseMinutes?: number;
  avgResolutionHours?: number;
  breakdown: ReportBreakdown;
  monthlyTrend: CountByLabel[];
  recentTasks: TaskListItem[];
}
export interface AllTasksReport {
  generatedAt: string; from?: string; to?: string;
  stats: ReportStats; breakdown: ReportBreakdown;
  byCategory: CountByLabel[]; byProject: CountByLabel[];
  tasks: TaskListItem[];
}
export interface TrendPoint { period: string; created: number; completed: number; inProgress: number; }
export interface TrendReport { generatedAt: string; last30Days: TrendPoint[]; last12Months: TrendPoint[]; }
export interface OverdueTaskRow {
  taskId: number; title: string; status: string; priority: string; type: string;
  assigneeName?: string; categoryName?: string; branchName?: string;
  createdAt: string; daysOpen: number; isUnassigned: boolean;
}
export interface OverdueReport {
  generatedAt: string; totalOpen: number;
  over1Day: number; over3Days: number; over7Days: number; over14Days: number;
  tasks: OverdueTaskRow[];
}

// ---- Excel Import ----
export interface ImportResult { imported: number; updated: number; failed: number; errors: string[]; }

// ---- Comments ----
export interface Comment {
  id: number; content: string; taskId: number;
  authorId: number; authorName: string; authorColor?: string;
  createdAt: string; updatedAt?: string;
}

// ---- Notifications ----
export interface Notification {
  id: number; type: NotificationType; title: string; message: string;
  isRead: boolean; taskId?: number; createdAt: string;
}

// ---- Dashboard ----
export interface DashboardStats {
  totalTasks: number; openTasks: number; inProgressTasks: number; completedTasks: number;
  unassignedTasks: number; myOpenTasks: number;
  activeProjects: number; completionRate: number;
}
export interface CountByLabel { label: string; count: number; }
export interface DashboardCharts {
  byStatus: CountByLabel[]; byPriority: CountByLabel[]; byType: CountByLabel[];
  byProject: CountByLabel[]; completedLast7Days: CountByLabel[];
}
export interface ActivityFeedItem {
  id: number; taskId: number; taskTitle: string; action: string;
  field?: string; oldValue?: string; newValue?: string;
  userId?: number; userName?: string; createdAt: string;
}
