import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Producto {
  id?: number;
  codigo?: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  stock?: number;
  id_categoria?: number;
  categoria_nombre?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductosService {
  private apiUrl = `${environment.apiUrl}/productos`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getProductos(page: number = 1, perPage: number = 15): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/?page=${page}&per_page=${perPage}`, { headers });
  }

  getProductoById(id: number): Observable<Producto> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<Producto>(`${this.apiUrl}/${id}`, { headers });
  }

  createProducto(data: Producto): Observable<Producto> {
    const headers = this.authService.getAuthHeaders();
    return this.http.post<Producto>(`${this.apiUrl}/`, data, { headers });
  }
}
