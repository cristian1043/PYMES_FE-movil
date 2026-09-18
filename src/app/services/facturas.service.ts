import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Factura {
  id?: number;
  numero?: string;
  numero_factura?: string;
  cliente_nombre?: string;
  cliente_documento?: string;
  cliente_tipo_documento?: string;
  documento_cliente?: string;
  tipo_documento?: string;
  cliente_id?: number;
  id_cliente?: number;
  total: number;
  subtotal?: number;
  iva?: number;
  descuento?: number;
  fecha?: string;
  estado?: string;
  metodo_pago?: string;
  id_metodo_pago?: number;
  cliente?: any;
  detalles?: any[];
  id_empresa?: number;
  pasarela?: string;
  referencia_pago?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FacturasService {
  private apiUrl = `${environment.apiUrl}/facturas`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getFacturas(page: number = 1, perPage: number = 15, empresaId?: number): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    const empId = empresaId || this.authService.getEmpresaActiva()?.id;
    const empParam = empId ? `&empresa_id=${empId}` : '';
    return this.http.get<any>(`${this.apiUrl}/?page=${page}&per_page=${perPage}${empParam}`, { headers });
  }

  getFacturaById(id: number): Observable<Factura> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<Factura>(`${this.apiUrl}/${id}`, { headers });
  }

  createFactura(data: Partial<Factura>): Observable<Factura> {
    const headers = this.authService.getAuthHeaders();
    if (!data.id_empresa) {
      const emp = this.authService.getEmpresaActiva();
      if (emp?.id) data.id_empresa = emp.id;
    }
    return this.http.post<Factura>(`${this.apiUrl}/`, data, { headers });
  }

  pagarFacturaPasarela(id: number, data: { pasarela: string; referencia_pago: string; id_metodo_pago?: number }): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.post<any>(`${this.apiUrl}/${id}/pagar`, data, { headers });
  }
}
