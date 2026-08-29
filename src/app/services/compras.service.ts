import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Compra {
  id: number;
  codigo_compra?: string;
  id_proveedor?: number;
  proveedor_nombre?: string;
  fecha?: string;
  total: number;
  estado?: string;
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

  getCompras(): Observable<Compra[]> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<Compra[]>(`${this.apiUrl}/`, { headers });
  }

  createCompra(data: Partial<Compra>): Observable<Compra> {
    const headers = this.authService.getAuthHeaders();
    return this.http.post<Compra>(`${this.apiUrl}/`, data, { headers });
  }
}
