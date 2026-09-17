import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
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

  private empresaActivaSubject = new BehaviorSubject<any>(this.getEmpresaActivaDesdeStorage());
  public empresaActiva$ = this.empresaActivaSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(credentials: { email?: string; username?: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap(response => {
        if (response.exito && response.access_token) {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('access_token', response.access_token);
          }
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('access_token', response.access_token);
          }
          if (response.usuario) {
            const u = response.usuario;
            const tieneEmpresas = Array.isArray(u.empresas) && u.empresas.length > 0;
            const esAdminGlobal = Number(u.id_rol) === 1 || (u.rol || '').toLowerCase().includes('admin');
            if (!tieneEmpresas && !esAdminGlobal) {
              u.rol = 'Usuario Independiente';
            }
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem('usuario', JSON.stringify(u));
            }
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('usuario', JSON.stringify(u));
            }
            this.currentUserSubject.next(u);
          }
        }
      })
    );
  }

  register(userData: { nombre: string; apellido?: string; username: string; email: string; password_hash?: string; password?: string; id_rol?: number }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/usuarios/`, userData);
  }

  logout(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('usuario');
      sessionStorage.removeItem('empresa_activa');
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('usuario');
      localStorage.removeItem('empresa_activa');
      localStorage.removeItem('ultima_empresa_activa');
    }
    this.currentUserSubject.next(null);
    this.empresaActivaSubject.next(null);
  }

  logoutGlobal(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.apiUrl}/auth/logout-global`, {}, { headers }).pipe(
      tap(() => {
        this.logout();
      }),
      catchError(() => {
        this.logout();
        return of(null);
      })
    );
  }

  getToken(): string | null {
    if (typeof sessionStorage !== 'undefined') {
      const token = sessionStorage.getItem('access_token');
      if (token) return token;
    }
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) return token;
    }
    return null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getUsuario(): any {
    return this.currentUserSubject.value;
  }

  updateUsuarioEnStorage(usuarioActualizado: any): void {
    const current = this.getUsuario() || {};
    const merged = { ...current, ...usuarioActualizado };
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('usuario', JSON.stringify(merged));
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('usuario', JSON.stringify(merged));
    }
    this.currentUserSubject.next(merged);
  }

  getEmpresaActiva(): any {
    return this.empresaActivaSubject.value;
  }

  setEmpresaActiva(empresa: any, rolId?: number): void {
    if (!empresa) {
      this.clearEmpresaActiva();
      return;
    }
    const empData = { ...empresa };
    if (rolId !== undefined && rolId !== null) {
      empData.rol_id = Number(rolId);
      const rolesNombres: Record<number, string> = { 1: 'Administrador', 2: 'Vendedor', 3: 'Almacenista' };
      empData.rol_nombre = rolesNombres[Number(rolId)] || 'Vendedor';
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('empresa_activa', JSON.stringify(empData));
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('empresa_activa', JSON.stringify(empData));
      localStorage.setItem('ultima_empresa_activa', JSON.stringify(empData));
    }
    this.empresaActivaSubject.next(empData);
  }

  clearEmpresaActiva(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('empresa_activa');
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('empresa_activa');
      localStorage.removeItem('ultima_empresa_activa');
    }
    this.empresaActivaSubject.next(null);
  }

  getRolId(): number {
    // Si hay una empresa activa seleccionada, tiene prioridad el rol asignado en dicha empresa
    const emp = this.getEmpresaActiva();
    if (emp && emp.rol_id !== undefined && emp.rol_id !== null) {
      return Number(emp.rol_id);
    }

    const u = this.getUsuario();
    if (!u) return 0;

    // Si es Administrador del Sistema global, conserva nivel 1
    const rolStr = (u.rol || '').toLowerCase();
    if (Number(u.id_rol) === 1 || Number(u.rol_id) === 1 || rolStr.includes('admin')) {
      return 1;
    }

    // Usuario independiente (sin empresa activa seleccionada): 0 (sin rol operativo)
    return 0;
  }

  hasRole(allowedRoles: number[]): boolean {
    if (!this.isLoggedIn()) return false;
    const userRol = this.getRolId();
    if (userRol === 0) return false;
    return allowedRoles.includes(userRol);
  }

  private getUsuarioDesdeStorage(): any {
    let userStr: string | null = null;
    if (typeof sessionStorage !== 'undefined') {
      userStr = sessionStorage.getItem('usuario');
    }
    if (!userStr && typeof localStorage !== 'undefined') {
      userStr = localStorage.getItem('usuario');
    }
    if (!userStr) return null;
    try {
      const u = JSON.parse(userStr);
      if (u) {
        const tieneEmpresas = Array.isArray(u.empresas) && u.empresas.length > 0;
        const esAdminGlobal = Number(u.id_rol) === 1 || (u.rol || '').toLowerCase().includes('admin');
        const tieneEmpresaActiva = !!this.getEmpresaActivaDesdeStorage();
        if (!tieneEmpresaActiva && !tieneEmpresas && !esAdminGlobal) {
          u.rol = 'Usuario Independiente';
        }
      }
      return u;
    } catch {
      return null;
    }
  }

  private getEmpresaActivaDesdeStorage(): any {
    try {
      if (typeof sessionStorage !== 'undefined') {
        const empStr = sessionStorage.getItem('empresa_activa');
        if (empStr) return JSON.parse(empStr);
      }
      if (typeof localStorage !== 'undefined') {
        const empStr = localStorage.getItem('empresa_activa') || localStorage.getItem('ultima_empresa_activa');
        if (empStr) {
          const parsed = JSON.parse(empStr);
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('empresa_activa', empStr);
          }
          return parsed;
        }
      }
      return null;
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
    const emp = this.getEmpresaActiva();
    if (emp && emp.id) {
      headers = headers.set('X-Empresa-ID', String(emp.id));
    }
    return headers;
  }

  cambiarPassword(usuarioId: number, passwordActual: string, passwordNueva: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/cambiar-password`, {
      usuario_id: usuarioId,
      password_actual: passwordActual,
      password_nueva: passwordNueva
    }, { headers: this.getAuthHeaders() });
  }

  solicitarRecuperacionPassword(identificador: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/recuperar-password-solicitar`, {
      identificador
    });
  }

  confirmarRecuperacionPassword(tokenOCodigo: string, passwordNueva: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/recuperar-password-confirmar`, {
      token: tokenOCodigo,
      password_nueva: passwordNueva
    });
  }
}

