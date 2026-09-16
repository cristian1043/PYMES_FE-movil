import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Cliente {
  id?: number;
  nombre: string;
  apellido?: string;
  tipo_documento?: string;
  documento?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  tiene_tarjeta?: string; // 'Sí' | 'No'
  tipo_tarjeta?: string; // 'Crédito' | 'Débito'
  banco_tarjeta?: string;
  franquicia_tarjeta?: string; // 'VISA' | 'Mastercard' | 'American Express'
  ultimos_digitos_tarjeta?: string;
  numero_tarjeta?: string;
  titular_tarjeta?: string;
  fecha_expiracion?: string;
  cvc_tarjeta?: string;
  estado?: string;
  created_at?: string;
  id_empresa?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ClientesService {
  private apiUrl = `${environment.apiUrl}/clientes`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getClientes(page: number = 1, perPage: number = 15, empresaId?: number): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    const empId = empresaId || this.authService.getEmpresaActiva()?.id;
    const empParam = empId ? `&empresa_id=${empId}` : '';
    return this.http.get<any>(`${this.apiUrl}/?page=${page}&per_page=${perPage}${empParam}`, { headers });
  }

  getCliente(id: number): Observable<Cliente> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<Cliente>(`${this.apiUrl}/${id}`, { headers });
  }

  createCliente(data: Cliente): Observable<Cliente> {
    const headers = this.authService.getAuthHeaders();
    if (!data.id_empresa) {
      const emp = this.authService.getEmpresaActiva();
      if (emp?.id) data.id_empresa = emp.id;
    }
    return this.http.post<Cliente>(`${this.apiUrl}/`, data, { headers });
  }

  updateCliente(id: number, data: Partial<Cliente>): Observable<Cliente> {
    const headers = this.authService.getAuthHeaders();
    return this.http.put<Cliente>(`${this.apiUrl}/${id}`, data, { headers });
  }

  deleteCliente(id: number): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { headers });
  }

  cambiarEstadoCliente(id: number, estado: string): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.patch<any>(`${this.apiUrl}/${id}/estado`, { estado }, { headers });
  }

  buscarPorDocumento(documento: string, empresaId?: number): Observable<Cliente> {
    const headers = this.authService.getAuthHeaders();
    const empId = empresaId || this.authService.getEmpresaActiva()?.id;
    const empParam = empId ? `&empresa_id=${empId}` : '';
    return this.http.get<Cliente>(`${this.apiUrl}/buscar?documento=${encodeURIComponent(documento)}${empParam}`, { headers });
  }
}
