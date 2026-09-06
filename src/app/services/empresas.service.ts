import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Empresa {
  id?: number;
  nombre: string;
  nit: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  estado?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmpresasService {
  private apiUrl = `${environment.apiUrl}/empresas`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getEmpresas(): Observable<Empresa[]> {
    return this.http.get<Empresa[]>(`${this.apiUrl}/`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  getEmpresa(id: number): Observable<Empresa> {
    return this.http.get<Empresa>(`${this.apiUrl}/${id}`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  getEmpresaPrincipal(): Observable<Empresa | null> {
    return this.getEmpresas().pipe(
      map(empresas => {
        if (Array.isArray(empresas) && empresas.length > 0) {
          return empresas[0];
        }
        return null;
      })
    );
  }

  updateEmpresa(id: number, data: Partial<Empresa>): Observable<Empresa> {
    return this.http.put<Empresa>(`${this.apiUrl}/${id}`, data, {
      headers: this.authService.getAuthHeaders()
    });
  }

  createEmpresa(data: Empresa): Observable<Empresa> {
    return this.http.post<Empresa>(`${this.apiUrl}/`, data, {
      headers: this.authService.getAuthHeaders()
    });
  }

  cambiarEstadoEmpresa(id: number, estado: string): Observable<Empresa> {
    return this.updateEmpresa(id, { estado });
  }

  getVinculacion(usuarioId: number, empresaId: number): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/usuario_empresas/vinculacion?usuario_id=${usuarioId}&empresa_id=${empresaId}`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  actualizarVinculacion(data: { usuario_id: number; empresa_id: number; estado?: string; rol_id?: number }): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/usuario_empresas/vinculacion`, data, {
      headers: this.authService.getAuthHeaders()
    });
  }
}
