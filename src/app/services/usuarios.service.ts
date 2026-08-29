import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface UsuarioItem {
  id: number;
  nombre: string;
  apellido?: string;
  username: string;
  email: string;
  id_rol: number;
  rol_nombre?: string;
  estado?: string;
  telefono?: string;
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

  getUsuarios(page: number = 1, perPage: number = 15): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/?page=${page}&per_page=${perPage}`, { headers });
  }

  deleteUsuario(id: number): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { headers });
  }
}
