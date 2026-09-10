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

  private empresaActivaSubject = new BehaviorSubject<any>(this.getEmpresaActivaDesdeStorage());
  public empresaActiva$ = this.empresaActivaSubject.asObservable();

  constructor(private http: HttpClient) {
    // Limpiar residuos de localStorage persistente antiguo para forzar la validación de credenciales al iniciar
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('usuario');
      localStorage.removeItem('empresa_activa');
    }
  }

  login(credentials: { email?: string; username?: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap(response => {
        if (response.exito && response.access_token) {
          sessionStorage.setItem('access_token', response.access_token);
          if (response.usuario) {
            sessionStorage.setItem('usuario', JSON.stringify(response.usuario));
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
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('usuario');
      sessionStorage.removeItem('empresa_activa');
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('usuario');
      localStorage.removeItem('empresa_activa');
    }
    this.currentUserSubject.next(null);
    this.empresaActivaSubject.next(null);
  }

  getToken(): string | null {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem('access_token');
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
    this.empresaActivaSubject.next(empData);
  }

  clearEmpresaActiva(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('empresa_activa');
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
    if (typeof sessionStorage === 'undefined') return null;
    const userStr = sessionStorage.getItem('usuario');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  private getEmpresaActivaDesdeStorage(): any {
    if (typeof sessionStorage === 'undefined') return null;
    const empStr = sessionStorage.getItem('empresa_activa');
    if (!empStr) return null;
    try {
      return JSON.parse(empStr);
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

