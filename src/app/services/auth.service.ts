import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface LoginResponse {
  exito: boolean;
  mensaje?: string;
  access_token?: string;
  refresh_token?: string;
  usuario?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<any>(this.getUsuarioDesdeStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(credentials: { email?: string; username?: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap(response => {
        if (response.exito && response.access_token) {
          localStorage.setItem('access_token', response.access_token);
          if (response.usuario) {
            localStorage.setItem('usuario', JSON.stringify(response.usuario));
            this.currentUserSubject.next(response.usuario);
          }
        }
      })
    );
  }

  register(userData: { nombre: string; apellido?: string; username: string; email: string; password_hash?: string; password?: string; id_rol?: number }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/usuarios/`, userData);
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('usuario');
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getUsuario(): any {
    return this.currentUserSubject.value;
  }

  getRolId(): number {
    const u = this.getUsuario();
    if (!u) return 0;
    if (u.id_rol !== undefined && u.id_rol !== null) return Number(u.id_rol);
    if (u.rol_id !== undefined && u.rol_id !== null) return Number(u.rol_id);
    const rolStr = (u.rol || '').toLowerCase();
    if (rolStr.includes('admin')) return 1;
    if (rolStr.includes('almacen')) return 3;
    if (rolStr.includes('vended') || rolStr.includes('usuario')) return 2;
    return 2;
  }

  hasRole(allowedRoles: number[]): boolean {
    if (!this.isLoggedIn()) return false;
    const userRol = this.getRolId();
    return allowedRoles.includes(userRol);
  }

  private getUsuarioDesdeStorage(): any {
    const userStr = localStorage.getItem('usuario');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    if (token && token.trim() !== '') {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }
}
