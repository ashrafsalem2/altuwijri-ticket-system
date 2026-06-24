import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActivityFeedItem, Area, AreaReport, Attachment, AvailableTechnician, Branch, BranchReport,
  ByTagReport, ByUserReport, ChatMessage, Conversation, DashboardCharts, DashboardStats, EmployeeTicketReport, Notification,
  OverviewReport, Project, Role, Tag, User
} from '../models/models';

const api = environment.apiBaseUrl;

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
  createBranch(b: any): Observable<Branch> { return this.http.post<Branch>(this.branches, b); }
  updateBranch(id: number, b: any): Observable<Branch> { return this.http.put<Branch>(`${this.branches}/${id}`, b); }
  deleteBranch(id: number): Observable<void> { return this.http.delete<void>(`${this.branches}/${id}`); }
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
