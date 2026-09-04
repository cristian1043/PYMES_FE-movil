import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface ItemCompra {
  id_producto: number;
  codigo?: string;
  nombre_producto?: string;
  costo_unitario: number;
  cantidad: number;
  subtotal: number;
}

export interface Compra {
  id?: number;
  numero?: string;
  codigo_compra?: string;
  id_proveedor: number;
  proveedor_nombre?: string;
  id_usuario?: number;
  fecha?: string;
  subtotal: number;
  iva: number;
  descuento: number;
  total: number;
  estado?: string;
  detalles?: ItemCompra[];
}

@Injectable({
  providedIn: 'root'
})
export class ComprasService {
  private apiUrl = `${environment.apiUrl}/compras`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getCompras(page: number = 1, perPage: number = 15): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/?page=${page}&per_page=${perPage}`, { headers });
  }

  getSiguienteNumero(): Observable<{ siguiente_numero: string }> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<{ siguiente_numero: string }>(`${this.apiUrl}/siguiente_numero`, { headers });
  }

  createCompra(data: Partial<Compra>): Observable<Compra> {
    const headers = this.authService.getAuthHeaders();
    return this.http.post<Compra>(`${this.apiUrl}/`, data, { headers });
  }
}
