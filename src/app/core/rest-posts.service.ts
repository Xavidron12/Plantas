import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface RestDemoPost {
  userId: number;
  id: number;
  title: string;
  body: string;
}

export type RestDemoPostInput = Pick<RestDemoPost, 'userId' | 'title' | 'body'>;

@Injectable({ providedIn: 'root' })
export class RestPostsService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'https://jsonplaceholder.typicode.com/posts';

  list(limit = 15): Observable<RestDemoPost[]> {
    return this.http.get<RestDemoPost[]>(`${this.baseUrl}?_limit=${limit}`);
  }

  getById(id: number): Observable<RestDemoPost> {
    return this.http.get<RestDemoPost>(`${this.baseUrl}/${id}`);
  }

  create(payload: RestDemoPostInput): Observable<RestDemoPost> {
    return this.http.post<RestDemoPost>(this.baseUrl, payload);
  }

  update(id: number, payload: RestDemoPostInput): Observable<RestDemoPost> {
    return this.http.put<RestDemoPost>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
