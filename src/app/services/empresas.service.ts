import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Empresa {
  id?: number;
  nombre: string;
  nit: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  estado?: string;
  plan_membresia?: string;
  precio_membresia?: number;
  precio_membresia_cop?: number;
  estado_membresia?: string;
  membresia_activa?: boolean;
  dias_restantes_membresia?: number;
  fecha_inicio_membresia?: string;
  fecha_vencimiento_membresia?: string;
  auto_renovacion?: boolean;
}

export interface PagoMembresia {
  id: number;
  id_empresa: number;
  id_usuario?: number | null;
  id_terminal?: number | null;
  terminal_nombre?: string | null;
  id_metodo_pago?: number | null;
  plan?: string;
  meses?: number;
  canal: 'link' | 'datafono' | 'manual' | string;
  proveedor: 'wompi' | 'bold' | 'simulado' | 'transferencia' | string;
  referencia: string;
  id_externo?: string | null;
  monto: number;
  monto_centavos: number;
  moneda: string;
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'ANULADA' | 'ERROR' | 'EXPIRADA' | string;
  url_pago?: string | null;
  mensaje?: string | null;
  simulado?: boolean;
  periodo_inicio?: string | null;
  periodo_fin?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface EstadoMembresiaResponse {
  empresa: Empresa;
  plan: {
    plan: string;
    precio_cop: number;
    precio_centavos: number;
    precio_formateado: string;
    moneda: string;
    periodicidad: string;
    dias_vigencia: number;
    beneficios: string[];
  };
  membresia: {
    id_empresa: number;
    nombre_empresa: string;
    plan: string;
    precio_cop: number;
    precio_formateado: string;
    moneda: string;
    estado: string;
    activa: boolean;
    dias_restantes: number;
    fecha_inicio?: string | null;
    fecha_vencimiento?: string | null;
    auto_renovacion?: boolean;
  };
  cobro_pendiente?: PagoMembresia | null;
  historial_pagos: PagoMembresia[];
}

@Injectable({
  providedIn: 'root'
})
export class EmpresasService {
  private apiUrl = `${environment.apiUrl}/empresas`;
  private membresiasUrl = `${environment.apiUrl}/membresias`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getEmpresas(): Observable<Empresa[]> {
    return this.http.get<Empresa[]>(`${this.apiUrl}/`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  getEmpresa(id: number): Observable<Empresa> {
    return this.http.get<Empresa>(`${this.apiUrl}/${id}`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  getEmpresaPrincipal(): Observable<Empresa | null> {
    return this.getEmpresas().pipe(
      map(empresas => {
        if (Array.isArray(empresas) && empresas.length > 0) {
          return empresas[0];
        }
        return null;
      })
    );
  }

  updateEmpresa(id: number, data: Partial<Empresa>): Observable<Empresa> {
    return this.http.put<Empresa>(`${this.apiUrl}/${id}`, data, {
      headers: this.authService.getAuthHeaders()
    });
  }

  createEmpresa(data: Empresa): Observable<Empresa> {
    return this.http.post<Empresa>(`${this.apiUrl}/`, data, {
      headers: this.authService.getAuthHeaders()
    });
  }

  cambiarEstadoEmpresa(id: number, estado: string): Observable<Empresa> {
    return this.updateEmpresa(id, { estado });
  }

  getVinculacion(usuarioId: number, empresaId: number): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/usuario_empresas/vinculacion?usuario_id=${usuarioId}&empresa_id=${empresaId}`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  actualizarVinculacion(data: { usuario_id: number; empresa_id: number; estado?: string; rol_id?: number }): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/usuario_empresas/vinculacion`, data, {
      headers: this.authService.getAuthHeaders()
    });
  }

  getMembresiaEmpresa(empresaId: number): Observable<EstadoMembresiaResponse> {
    return this.http.get<EstadoMembresiaResponse>(`${this.membresiasUrl}/empresa/${empresaId}`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  crearCobroMembresia(
    empresaId: number,
    data: {
      canal: 'link' | 'datafono' | 'manual';
      id_metodo_pago?: number;
      id_terminal?: number;
      meses?: number;
      referencia_pago?: string;
    }
  ): Observable<{ cobro: PagoMembresia; empresa: Empresa; mensaje?: string }> {
    return this.http.post<{ cobro: PagoMembresia; empresa: Empresa; mensaje?: string }>(
      `${this.membresiasUrl}/empresa/${empresaId}/cobrar`,
      { ...data, id_empresa: empresaId },
      { headers: this.authService.getAuthHeaders() }
    );
  }

  getCobroMembresia(cobroId: number): Observable<{ cobro: PagoMembresia; empresa: Empresa }> {
    return this.http.get<{ cobro: PagoMembresia; empresa: Empresa }>(
      `${this.membresiasUrl}/cobros/${cobroId}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  simularCobroMembresia(
    cobroId: number,
    resultado: 'APROBADA' | 'RECHAZADA'
  ): Observable<{ cobro: PagoMembresia; empresa: Empresa }> {
    return this.http.post<{ cobro: PagoMembresia; empresa: Empresa }>(
      `${this.membresiasUrl}/cobros/${cobroId}/simular`,
      { resultado },
      { headers: this.authService.getAuthHeaders() }
    );
  }

  cancelarCobroMembresia(cobroId: number): Observable<{ cobro: PagoMembresia; empresa: Empresa }> {
    return this.http.post<{ cobro: PagoMembresia; empresa: Empresa }>(
      `${this.membresiasUrl}/cobros/${cobroId}/cancelar`,
      {},
      { headers: this.authService.getAuthHeaders() }
    );
  }
}
