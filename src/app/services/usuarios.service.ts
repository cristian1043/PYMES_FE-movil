import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface UsuarioItem {
  id?: number;
  tipo_documento?: string;
  documento?: string;
  nombre: string;
  apellido?: string;
  telefono?: string;
  username: string;
  email: string;
  id_rol: number;
  rol_nombre?: string;
  estado?: string;
  password?: string;
  banco?: string;
  tipo_cuenta?: string;
  numero_cuenta?: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  private apiUrl = `${environment.apiUrl}/usuarios`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getUsuarios(page: number = 1, perPage: number = 10): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/?page=${page}&per_page=${perPage}`, { headers });
  }

  getUsuarioById(id: number): Observable<UsuarioItem> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<UsuarioItem>(`${this.apiUrl}/${id}`, { headers });
  }

  checkUsernameDisponible(username: string): Observable<{ disponible: boolean }> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<{ disponible: boolean }>(`${this.apiUrl}/check-username/${encodeURIComponent(username.trim())}`, { headers });
  }

  createUsuario(data: Partial<UsuarioItem>): Observable<UsuarioItem> {
    const headers = this.authService.getAuthHeaders();
    return this.http.post<UsuarioItem>(`${this.apiUrl}/`, data, { headers });
  }

  updateUsuario(id: number, data: Partial<UsuarioItem>): Observable<UsuarioItem> {
    const headers = this.authService.getAuthHeaders();
    return this.http.put<UsuarioItem>(`${this.apiUrl}/${id}`, data, { headers });
  }

  cambiarEstado(id: number, estado: string): Observable<UsuarioItem> {
    return this.updateUsuario(id, { estado });
  }

  cambiarRol(id: number, id_rol: number): Observable<UsuarioItem> {
    return this.updateUsuario(id, { id_rol });
  }

  deleteUsuario(id: number): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { headers });
  }
}
