import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Proveedor {
  id: number;
  nombre: string;
  nit_documento?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
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

  getProveedores(page: number = 1, perPage: number = 15): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/?page=${page}&per_page=${perPage}`, { headers });
  }

  createProveedor(data: Partial<Proveedor>): Observable<Proveedor> {
    const headers = this.authService.getAuthHeaders();
    return this.http.post<Proveedor>(`${this.apiUrl}/`, data, { headers });
  }
}
