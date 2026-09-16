import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Proveedor {
  id: number;
  nombre: string;
  nit_documento?: string;
  nit?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  estado?: string;
  id_empresa?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProveedoresService {
  private apiUrl = `${environment.apiUrl}/proveedores`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getProveedores(page: number = 1, perPage: number = 15, empresaId?: number): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    const empId = empresaId || this.authService.getEmpresaActiva()?.id;
    const empParam = empId ? `&empresa_id=${empId}` : '';
    return this.http.get<any>(`${this.apiUrl}/?page=${page}&per_page=${perPage}${empParam}`, { headers });
  }

  createProveedor(data: Partial<Proveedor>): Observable<Proveedor> {
    const headers = this.authService.getAuthHeaders();
    if (!data.id_empresa) {
      const emp = this.authService.getEmpresaActiva();
      if (emp?.id) data.id_empresa = emp.id;
    }
    return this.http.post<Proveedor>(`${this.apiUrl}/`, data, { headers });
  }

  deleteProveedor(id: number): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { headers });
  }

  cambiarEstadoProveedor(id: number, estado: string): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.patch<any>(`${this.apiUrl}/${id}/estado`, { estado }, { headers });
  }
}
