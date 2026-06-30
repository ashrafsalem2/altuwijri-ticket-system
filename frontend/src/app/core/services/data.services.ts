import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActivityFeedItem, AllTasksReport, AppLink, Area, AreaReport, Attachment, AvailableTechnician, Branch, BranchPublic, BranchReport,
  ByDepartmentReport, ByGroupReport, ByTagReport, ByUserReport, ChatMessage, Conversation, DashboardCharts, DashboardStats,
  Department, EmployeeTicketReport, Guideline, ImportResult, Notification, OverdueReport, OverviewReport, Project, Role,
  SaveTicketCategoryRequest, SingleTaskReport, SingleUserReport, Tag, TicketCategory, TrendReport, User
} from '../models/models';
import { ToastService } from './toast.service';

const api = environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class AppLinksService {
  private http = inject(HttpClient);
  private base = `${api}/api/app-links`;
  getAll(): Observable<AppLink[]> { return this.http.get<AppLink[]>(this.base); }
  create(body: any): Observable<AppLink> { return this.http.post<AppLink>(this.base, body); }
  update(id: number, body: any): Observable<AppLink> { return this.http.put<AppLink>(`${this.base}/${id}`, body); }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private http = inject(HttpClient);
  private base = `${api}/api/projects`;
  getAll(): Observable<Project[]> { return this.http.get<Project[]>(this.base); }
  get(id: number): Observable<Project> { return this.http.get<Project>(`${this.base}/${id}`); }
  create(body: Partial<Project>): Observable<Project> { return this.http.post<Project>(this.base, body); }
  update(id: number, body: Partial<Project>): Observable<Project> { return this.http.put<Project>(`${this.base}/${id}`, body); }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private base = `${api}/api/users`;
  getAll(includeInactive = false): Observable<User[]> {
    return this.http.get<User[]>(this.base, { params: new HttpParams().set('includeInactive', includeInactive) });
  }
  roles(): Observable<Role[]> { return this.http.get<Role[]>(`${this.base}/roles`); }
  create(body: any): Observable<User> { return this.http.post<User>(this.base, body); }
  update(id: number, body: any): Observable<User> { return this.http.put<User>(`${this.base}/${id}`, body); }
  deactivate(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/${id}`); }
  hardDelete(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/${id}/purge`); }
  resetPassword(id: number, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/reset-password`, { newPassword });
  }
  setMyAvailability(available: boolean): Observable<void> {
    return this.http.post<void>(`${this.base}/me/availability`, { available });
  }
}

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private http = inject(HttpClient);
  private areas = `${api}/api/areas`;
  private branches = `${api}/api/branches`;
  getAreas(): Observable<Area[]> { return this.http.get<Area[]>(this.areas); }
  createArea(b: any): Observable<Area> { return this.http.post<Area>(this.areas, b); }
  updateArea(id: number, b: any): Observable<Area> { return this.http.put<Area>(`${this.areas}/${id}`, b); }
  deleteArea(id: number): Observable<void> { return this.http.delete<void>(`${this.areas}/${id}`); }
  getBranches(areaId?: number): Observable<Branch[]> {
    let p = new HttpParams(); if (areaId) p = p.set('areaId', areaId);
    return this.http.get<Branch[]>(this.branches, { params: p });
  }
  getMyBranch(): Observable<BranchPublic | null> { return this.http.get<BranchPublic | null>(`${this.branches}/me`); }
  createBranch(b: any): Observable<Branch> { return this.http.post<Branch>(this.branches, b); }
  updateBranch(id: number, b: any): Observable<Branch> { return this.http.put<Branch>(`${this.branches}/${id}`, b); }
  deleteBranch(id: number): Observable<void> { return this.http.delete<void>(`${this.branches}/${id}`); }
  private devices = `${api}/api/devices`;
  createDevice(d: any): Observable<any> { return this.http.post(this.devices, d); }
  updateDevice(id: number, d: any): Observable<any> { return this.http.put(`${this.devices}/${id}`, d); }
  deleteDevice(id: number): Observable<void> { return this.http.delete<void>(`${this.devices}/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class GuidelinesService {
  private http = inject(HttpClient);
  private base = `${api}/api/guidelines`;
  getAll(): Observable<Guideline[]> { return this.http.get<Guideline[]>(this.base); }
  create(body: Partial<Guideline>): Observable<Guideline> { return this.http.post<Guideline>(this.base, body); }
  update(id: number, body: Partial<Guideline>): Observable<Guideline> { return this.http.put<Guideline>(`${this.base}/${id}`, body); }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private http = inject(HttpClient);
  private base = `${api}/api/reports`;
  branch(id: number): Observable<BranchReport> { return this.http.get<BranchReport>(`${this.base}/branch/${id}`); }
  area(id: number): Observable<AreaReport> { return this.http.get<AreaReport>(`${this.base}/area/${id}`); }
  overview(): Observable<OverviewReport> { return this.http.get<OverviewReport>(`${this.base}/overview`); }
  myTickets(from?: string, to?: string): Observable<EmployeeTicketReport> {
    let p = new HttpParams();
    if (from) p = p.set('from', from);
    if (to) p = p.set('to', to);
    return this.http.get<EmployeeTicketReport>(`${this.base}/my-tickets`, { params: p });
  }
  byTag(): Observable<ByTagReport> { return this.http.get<ByTagReport>(`${this.base}/by-tag`); }
  byUser(): Observable<ByUserReport> { return this.http.get<ByUserReport>(`${this.base}/by-user`); }
  byGroup(): Observable<ByGroupReport> { return this.http.get<ByGroupReport>(`${this.base}/by-group`); }
  byDepartment(): Observable<ByDepartmentReport> { return this.http.get<ByDepartmentReport>(`${this.base}/by-department`); }
  singleUser(userId: number, from?: string, to?: string): Observable<SingleUserReport> {
    let p = new HttpParams();
    if (from) p = p.set('from', from);
    if (to) p = p.set('to', to);
    return this.http.get<SingleUserReport>(`${this.base}/user/${userId}`, { params: p });
  }
  singleTask(taskId: number): Observable<SingleTaskReport> { return this.http.get<SingleTaskReport>(`${this.base}/task/${taskId}`); }
  allTasks(from?: string, to?: string): Observable<AllTasksReport> {
    let p = new HttpParams();
    if (from) p = p.set('from', from);
    if (to) p = p.set('to', to);
    return this.http.get<AllTasksReport>(`${this.base}/all-tasks`, { params: p });
  }
  trend(): Observable<TrendReport> { return this.http.get<TrendReport>(`${this.base}/trend`); }
  overdue(): Observable<OverdueReport> { return this.http.get<OverdueReport>(`${this.base}/overdue`); }
}

@Injectable({ providedIn: 'root' })
export class TicketCategoryService {
  private http = inject(HttpClient);
  private base = `${api}/api/ticket-categories`;
  getAll(): Observable<TicketCategory[]> { return this.http.get<TicketCategory[]>(this.base); }
  create(body: SaveTicketCategoryRequest): Observable<TicketCategory> { return this.http.post<TicketCategory>(this.base, body); }
  update(id: number, body: SaveTicketCategoryRequest): Observable<TicketCategory> { return this.http.put<TicketCategory>(`${this.base}/${id}`, body); }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class AttachmentService {
  private http = inject(HttpClient);
  private base(taskId: number) { return `${api}/api/tasks/${taskId}/attachments`; }
  list(taskId: number): Observable<Attachment[]> { return this.http.get<Attachment[]>(this.base(taskId)); }
  upload(taskId: number, file: File): Observable<Attachment> {
    const form = new FormData(); form.append('file', file, file.name);
    return this.http.post<Attachment>(`${this.base(taskId)}/upload`, form);
  }
  addLink(taskId: number, title: string, url: string): Observable<Attachment> {
    return this.http.post<Attachment>(`${this.base(taskId)}/link`, { title, url });
  }
  getBlob(taskId: number, id: number): Observable<Blob> {
    return this.http.get(`${this.base(taskId)}/${id}/download`, { responseType: 'blob' });
  }
  delete(taskId: number, id: number): Observable<void> { return this.http.delete<void>(`${this.base(taskId)}/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private base = `${api}/api/chat`;
  technicians(onlyAvailable = true): Observable<AvailableTechnician[]> {
    return this.http.get<AvailableTechnician[]>(`${this.base}/technicians`, { params: new HttpParams().set('onlyAvailable', onlyAvailable) });
  }
  /** Shared signal so any component can instantly clear the sidebar badge. */
  readonly chatUnread = signal(0);
  refreshUnread() { this.unreadCount().subscribe(n => this.chatUnread.set(n)); }

  conversations(): Observable<Conversation[]> { return this.http.get<Conversation[]>(`${this.base}/conversations`); }
  start(technicianId: number, subject: string, taskId?: number): Observable<Conversation> {
    return this.http.post<Conversation>(`${this.base}/conversations`, { technicianId, subject, taskId: taskId ?? null });
  }
  messages(id: number): Observable<ChatMessage[]> { return this.http.get<ChatMessage[]>(`${this.base}/conversations/${id}/messages`); }
  send(id: number, content: string): Observable<ChatMessage> { return this.http.post<ChatMessage>(`${this.base}/conversations/${id}/messages`, { content }); }
  close(id: number): Observable<void> { return this.http.post<void>(`${this.base}/conversations/${id}/close`, {}); }
  unreadCount(): Observable<number> { return this.http.get<number>(`${this.base}/unread-count`); }
}

@Injectable({ providedIn: 'root' })
export class TagService {
  private http = inject(HttpClient);
  private base = `${api}/api/tags`;
  getAll(): Observable<Tag[]> { return this.http.get<Tag[]>(this.base); }
  create(name: string, color: string, icon?: string): Observable<Tag> { return this.http.post<Tag>(this.base, { name, color, icon }); }
  update(id: number, name: string, color: string, icon?: string): Observable<Tag> { return this.http.put<Tag>(`${this.base}/${id}`, { name, color, icon }); }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private base = `${api}/api/dashboard`;
  stats(): Observable<DashboardStats> { return this.http.get<DashboardStats>(`${this.base}/stats`); }
  charts(): Observable<DashboardCharts> { return this.http.get<DashboardCharts>(`${this.base}/charts`); }
  activity(take = 15): Observable<ActivityFeedItem[]> {
    return this.http.get<ActivityFeedItem[]>(`${this.base}/activity`, { params: new HttpParams().set('take', take) });
  }
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private base = `${api}/api/notifications`;
  getMine(unreadOnly = false): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.base, { params: new HttpParams().set('unreadOnly', unreadOnly) });
  }
  unreadCount(): Observable<number> { return this.http.get<number>(`${this.base}/unread-count`); }
  markRead(id: number): Observable<void> { return this.http.post<void>(`${this.base}/${id}/read`, {}); }
  markAllRead(): Observable<void> { return this.http.post<void>(`${this.base}/read-all`, {}); }
}


@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private http = inject(HttpClient);
  private base = `${api}/api/departments`;
  getAll(): Observable<Department[]> { return this.http.get<Department[]>(this.base); }
  create(body: Partial<Department>): Observable<Department> { return this.http.post<Department>(this.base, body); }
  update(id: number, body: Partial<Department>): Observable<Department> { return this.http.put<Department>(`${this.base}/${id}`, body); }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class ExcelService {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private base = `${api}/api/excel`;

  downloadTemplate(type: 'users' | 'branches' | 'areas' | 'projects' | 'ticket-categories' | 'departments'): void {
    this.http.get(`${this.base}/${type}/template`, { responseType: 'blob' }).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-import-template.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
      error: e => this.toast.error(`Template download failed: ${e?.status ?? ''} ${e?.statusText ?? 'Unknown error'}`)
    });
  }

  import(type: 'users' | 'branches' | 'areas' | 'projects' | 'ticket-categories' | 'departments', file: File): Observable<ImportResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ImportResult>(`${this.base}/${type}/import`, form);
  }
}
