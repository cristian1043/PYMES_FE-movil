import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { Factura } from './facturas.service';

export interface CobroTransaccion {
  id: number;
  id_factura: number;
  id_empresa?: number;
  id_terminal?: number | null;
  id_metodo_pago?: number | null;
  canal: 'datafono' | 'link' | string;
  proveedor: 'bold' | 'wompi' | 'simulado' | string;
  referencia: string;
  id_externo?: string | null;
  monto: number;
  monto_centavos: number;
  moneda: string;
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'ANULADA' | 'ERROR' | 'EXPIRADA' | string;
  url_pago?: string | null;
  mensaje?: string | null;
  simulado?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RespuestaCobro {
  cobro: CobroTransaccion;
  factura?: Factura;
}

@Injectable({
  providedIn: 'root'
})
export class CobrosService {
  private facturasUrl = `${environment.apiUrl}/facturas`;
  private cobrosUrl = `${environment.apiUrl}/cobros`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  crearCobro(
    idFactura: number,
    data: { canal: 'datafono' | 'link'; id_terminal?: number; id_metodo_pago?: number }
  ): Observable<RespuestaCobro> {
    const headers = this.authService.getAuthHeaders();
    return this.http.post<RespuestaCobro>(`${this.facturasUrl}/${idFactura}/cobros`, data, { headers });
  }

  listarCobrosPorFactura(idFactura: number): Observable<CobroTransaccion[]> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<CobroTransaccion[]>(`${this.facturasUrl}/${idFactura}/cobros`, { headers });
  }

  getCobro(idCobro: number): Observable<RespuestaCobro> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<RespuestaCobro>(`${this.cobrosUrl}/${idCobro}`, { headers });
  }

  cancelarCobro(idCobro: number): Observable<RespuestaCobro> {
    const headers = this.authService.getAuthHeaders();
    return this.http.post<RespuestaCobro>(`${this.cobrosUrl}/${idCobro}/cancelar`, {}, { headers });
  }

  simularCobro(idCobro: number, resultado: 'APROBADA' | 'RECHAZADA'): Observable<RespuestaCobro> {
    const headers = this.authService.getAuthHeaders();
    return this.http.post<RespuestaCobro>(`${this.cobrosUrl}/${idCobro}/simular`, { resultado }, { headers });
  }

  conciliarCobros(params?: { minutos_expiracion?: number; horas_facturas_sin_pago?: number; empresa_id?: number }): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.post<any>(`${this.cobrosUrl}/conciliar`, params || {}, { headers });
  }
}
