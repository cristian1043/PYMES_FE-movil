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
  costo?: number;
  stock?: number;
  unidad_medida?: string;
  id_categoria?: number;
  categoria_nombre?: string;
  id_proveedor?: number;
  proveedor_nombre?: string;
  estado?: string;
  imagen?: string;
  id_empresa?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductosService {
  private apiUrl = `${environment.apiUrl}/productos`;
  private categoriasUrl = `${environment.apiUrl}/categorias`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getProductos(page: number = 1, perPage: number = 10, empresaId?: number): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    const empId = empresaId || this.authService.getEmpresaActiva()?.id;
    const empParam = empId ? `&empresa_id=${empId}` : '';
    return this.http.get<any>(`${this.apiUrl}/?page=${page}&per_page=${perPage}${empParam}`, { headers });
  }

  getProductoById(id: number): Observable<Producto> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<Producto>(`${this.apiUrl}/${id}`, { headers });
  }

  createProducto(data: Producto): Observable<Producto> {
    const headers = this.authService.getAuthHeaders();
    if (!data.id_empresa) {
      const emp = this.authService.getEmpresaActiva();
      if (emp?.id) data.id_empresa = emp.id;
    }
    return this.http.post<Producto>(`${this.apiUrl}/`, data, { headers });
  }

  updateProducto(id: number, data: Partial<Producto>): Observable<Producto> {
    const headers = this.authService.getAuthHeaders();
    return this.http.put<Producto>(`${this.apiUrl}/${id}`, data, { headers });
  }

  deleteProducto(id: number): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { headers });
  }

  cambiarEstadoProducto(id: number, estado: string): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.patch<any>(`${this.apiUrl}/${id}/estado`, { estado }, { headers });
  }

  getSiguienteCodigo(): Observable<{ siguiente_codigo: string }> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<{ siguiente_codigo: string }>(`${this.apiUrl}/siguiente_codigo`, { headers });
  }

  getCategorias(): Observable<any[]> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<any[]>(`${this.categoriasUrl}/`, { headers });
  }
}
