import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface MetodoPago {
  id?: number;
  nombre: string;
  descripcion?: string;
  tipo: string; // 'Efectivo' | 'Transferencia' | 'Tarjeta' | 'Pasarela' | 'Billetera Digital' | 'Crédito'
  banco?: string;
  numero_cuenta?: string;
  titular?: string;
  id_empresa?: number;
  es_global?: boolean;
  estado?: string;
  pasarela?: string; // 'ninguna' | 'wompi' | 'mercadopago' | 'stripe' | 'bold' | 'payu' | 'epayco'
  api_key_publica?: string;
  api_key_privada?: string;
  webhook_secret?: string;
  modo?: string; // 'sandbox' | 'produccion'
  tiene_llave_privada?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MetodosPagoService {
  private apiUrl = `${environment.apiUrl}/metodos_pago`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getMetodosPago(empresaId?: number): Observable<MetodoPago[]> {
    const headers = this.authService.getAuthHeaders();
    const empId = empresaId || this.authService.getEmpresaActiva()?.id;
    const empParam = empId ? `?empresa_id=${empId}` : '';
    return this.http.get<MetodoPago[]>(`${this.apiUrl}/${empParam}`, { headers });
  }

  getMetodoPagoById(id: number, incluirClaves: boolean = false): Observable<MetodoPago> {
    const headers = this.authService.getAuthHeaders();
    const query = incluirClaves ? '?incluir_claves=true' : '';
    return this.http.get<MetodoPago>(`${this.apiUrl}/${id}${query}`, { headers });
  }

  createMetodoPago(data: Partial<MetodoPago>): Observable<MetodoPago> {
    const headers = this.authService.getAuthHeaders();
    if (!data.id_empresa) {
      const emp = this.authService.getEmpresaActiva();
      if (emp?.id) data.id_empresa = emp.id;
    }
    return this.http.post<MetodoPago>(`${this.apiUrl}/`, data, { headers });
  }

  updateMetodoPago(id: number, data: Partial<MetodoPago>): Observable<MetodoPago> {
    const headers = this.authService.getAuthHeaders();
    return this.http.put<MetodoPago>(`${this.apiUrl}/${id}`, data, { headers });
  }

  deleteMetodoPago(id: number): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { headers });
  }
}
