import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface TerminalPago {
  id?: number;
  id_empresa?: number;
  nombre: string;
  proveedor?: 'bold' | 'simulado' | string;
  id_metodo_pago: number;
  metodo_pago_nombre?: string;
  terminal_serial?: string;
  terminal_model?: string;
  email_usuario?: string;
  estado?: 'Activo' | 'Inactivo' | string;
  created_at?: string;
}

export interface TerminalDisponible {
  terminal_serial: string;
  terminal_model: string;
  name?: string;
  status?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TerminalesService {
  private apiUrl = `${environment.apiUrl}/terminales`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getTerminales(empresaId?: number, soloActivas: boolean = false): Observable<TerminalPago[]> {
    const headers = this.authService.getAuthHeaders();
    const emp = this.authService.getEmpresaActiva();
    const empId = empresaId || emp?.id || emp?.empresa_id || 1;
    const params: string[] = [];
    if (empId) params.push(`empresa_id=${empId}`);
    if (soloActivas) params.push('solo_activas=true');
    const query = params.length > 0 ? `?${params.join('&')}` : '';
    return this.http.get<TerminalPago[]>(`${this.apiUrl}/${query}`, { headers });
  }

  getTerminalesDisponibles(idMetodoPago: number, empresaId?: number): Observable<{ terminales: TerminalDisponible[] }> {
    const headers = this.authService.getAuthHeaders();
    const emp = this.authService.getEmpresaActiva();
    const empId = empresaId || emp?.id || emp?.empresa_id || 1;
    const empParam = empId ? `&empresa_id=${empId}` : '';
    return this.http.get<{ terminales: TerminalDisponible[] }>(
      `${this.apiUrl}/disponibles?id_metodo_pago=${idMetodoPago}${empParam}`,
      { headers }
    );
  }

  createTerminal(data: Partial<TerminalPago>): Observable<TerminalPago> {
    const headers = this.authService.getAuthHeaders();
    if (!data.id_empresa) {
      const emp = this.authService.getEmpresaActiva();
      data.id_empresa = emp?.id || emp?.empresa_id || 1;
    }
    return this.http.post<TerminalPago>(`${this.apiUrl}/`, data, { headers });
  }

  updateTerminal(id: number, data: Partial<TerminalPago>): Observable<TerminalPago> {
    const headers = this.authService.getAuthHeaders();
    return this.http.put<TerminalPago>(`${this.apiUrl}/${id}`, data, { headers });
  }

  deleteTerminal(id: number): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { headers });
  }
}
