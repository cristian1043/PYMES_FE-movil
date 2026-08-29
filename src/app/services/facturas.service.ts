import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Factura {
  id?: number;
  numero_factura?: string;
  cliente_nombre?: string;
  cliente_id?: number;
  total: number;
  fecha?: string;
  estado?: string;
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

  getFacturas(page: number = 1, perPage: number = 50): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/?page=${page}&per_page=${perPage}`, { headers });
  }
}
