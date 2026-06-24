import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Comment, CreateTaskRequest, PagedResult, TaskDetail, TaskListItem, UpdateTaskRequest,
  WorkTaskStatus
} from '../models/models';

export interface TaskQuery {
  search?: string; status?: WorkTaskStatus; statuses?: WorkTaskStatus[]; priority?: string; type?: string;
  projectId?: number; branchId?: number; assigneeId?: number; overdue?: boolean;
  sortBy?: string; sortDescending?: boolean; page?: number; pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/api/tasks`;

  query(q: TaskQuery): Observable<PagedResult<TaskListItem>> {
    let params = new HttpParams();
    Object.entries(q).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      if (Array.isArray(v)) {
        v.forEach(item => { params = params.append(k, String(item)); });
      } else {
        params = params.set(k, String(v));
      }
    });
    return this.http.get<PagedResult<TaskListItem>>(this.base, { params });
  }

  board(projectId?: number): Observable<TaskListItem[]> {
    let params = new HttpParams();
    if (projectId) params = params.set('projectId', projectId);
    return this.http.get<TaskListItem[]>(`${this.base}/board`, { params });
  }

  get(id: number): Observable<TaskDetail> { return this.http.get<TaskDetail>(`${this.base}/${id}`); }
  create(body: CreateTaskRequest): Observable<TaskDetail> { return this.http.post<TaskDetail>(this.base, body); }
  update(id: number, body: UpdateTaskRequest): Observable<TaskDetail> { return this.http.put<TaskDetail>(`${this.base}/${id}`, body); }
  move(id: number, status: WorkTaskStatus, boardOrder: number): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}/move`, { status, boardOrder });
  }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/${id}`); }

  comments(taskId: number): Observable<Comment[]> { return this.http.get<Comment[]>(`${this.base}/${taskId}/comments`); }
  addComment(taskId: number, content: string): Observable<Comment> {
    return this.http.post<Comment>(`${this.base}/${taskId}/comments`, { content });
  }
  deleteComment(commentId: number): Observable<void> { return this.http.delete<void>(`${this.base}/comments/${commentId}`); }
}
