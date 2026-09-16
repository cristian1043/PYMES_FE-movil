import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  private apiUrl = `${environment.apiUrl}/reportes`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getEmpresaQuery(empresaId?: number): string {
    const empId = empresaId || this.authService.getEmpresaActiva()?.id;
    return empId ? `?empresa_id=${empId}` : '';
  }

  getReporteInventario(empresaId?: number): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/inventario${this.getEmpresaQuery(empresaId)}`, { headers });
  }

  getReporteVentas(empresaId?: number): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/ventas${this.getEmpresaQuery(empresaId)}`, { headers });
  }

  getDashboardMetrics(empresaId?: number): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/dashboard${this.getEmpresaQuery(empresaId)}`, { headers });
  }

  getReporteClientes(empresaId?: number): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/clientes${this.getEmpresaQuery(empresaId)}`, { headers });
  }

  getReporteTopProductos(empresaId?: number): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/top-productos${this.getEmpresaQuery(empresaId)}`, { headers });
  }
}
