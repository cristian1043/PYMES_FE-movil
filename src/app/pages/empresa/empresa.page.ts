import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular/lazy';
import { AuthService } from '../../services/auth.service';
import { EmpresasService, Empresa, PagoMembresia } from '../../services/empresas.service';
import { MetodosPagoService, MetodoPago } from '../../services/metodos-pago.service';
import { TerminalesService, TerminalPago } from '../../services/terminales.service';
import { MenuStateService } from '../../services/menu-state.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-empresa',
  templateUrl: './empresa.page.html',
  styleUrls: ['./empresa.page.scss'],
  standalone: false
})
export class EmpresaPage implements OnInit, OnDestroy {
  empresa: Empresa | null = null;
  loading = false;
  guardando = false;
  usuario: any = null;

  // Campos de configuración
  nombre = '';
  nit = '';
  telefono = '';
  email = '';
  direccion = '';
  estado = 'Activo';

  // Membresía ($19.900 COP / mes)
  readonly precioMembresiaCop = 19900;
  canalMembresia: 'link' | 'datafono' | 'manual' = 'link';
  idMetodoMembresia: number | null = null;
  idTerminalMembresia: number | null = null;
  referenciaManualMembresia = '';
  metodosLink: MetodoPago[] = [];
  terminalesActivas: TerminalPago[] = [];
  cobroMembresiaActual: PagoMembresia | null = null;
  pagosMembresia: PagoMembresia[] = [];
  procesandoMembresia = false;
  private pollingMembresiaTimer: any = null;
  private pollingMembresiaStart = 0;

  // Modal de confirmación de cambio de estado operativo
  mostrarModalConfirmacionEstado = false;
  cambiandoEstado = false;

  constructor(
    private authService: AuthService,
    private empresasService: EmpresasService,
    private metodosPagoService: MetodosPagoService,
    private terminalesService: TerminalesService,
    private router: Router,
    private menuStateService: MenuStateService,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.verificarAutenticacion();
  }

  ionViewWillEnter(): void {
    this.verificarAutenticacion();
    this.cargarDatosEmpresa();
    this.cargarPasarelasYTerminales();
  }

  ionViewWillLeave(): void {
    this.detenerPollingMembresia();
  }

  ngOnDestroy(): void {
    this.detenerPollingMembresia();
  }

  private verificarAutenticacion(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }
    this.usuario = this.authService.getUsuario();
    // Exclusivo para Administrador (Rol 1)
    if (this.authService.getRolId() !== 1) {
      this.router.navigate(['/inicio'], { replaceUrl: true });
    }
  }

  toggleMenu(): void {
    this.menuStateService.toggle();
  }

  irAIndex(): void {
    this.router.navigateByUrl('/inicio');
  }

  irATerminales(): void {
    this.router.navigateByUrl('/terminales');
  }

  cargarPasarelasYTerminales(): void {
    this.metodosPagoService.getMetodosPago().subscribe({
      next: (metodos) => {
        if (Array.isArray(metodos)) {
          this.metodosLink = metodos.filter(m =>
            ['wompi', 'simulado'].includes((m.pasarela || '').toLowerCase()) &&
            (m.estado || 'Activo') === 'Activo'
          );
          if (this.metodosLink.length > 0 && !this.idMetodoMembresia) {
            this.idMetodoMembresia = this.metodosLink[0].id || null;
          }
        }
        this.cdr.detectChanges();
      },
      error: () => {}
    });

    this.terminalesService.getTerminales(true).subscribe({
      next: (terms) => {
        if (Array.isArray(terms)) {
          this.terminalesActivas = terms;
          if (this.terminalesActivas.length > 0 && !this.idTerminalMembresia) {
            this.idTerminalMembresia = this.terminalesActivas[0].id || null;
          }
        }
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  cargarDatosEmpresa(event?: any): void {
    this.loading = true;
    this.cdr.detectChanges();

    const activeEmp = this.authService.getEmpresaActiva();
    const targetId = activeEmp ? Number(activeEmp.id) : null;

    this.empresasService.getEmpresas()
      .pipe(
        finalize(() => {
          this.loading = false;
          if (event) event.target.complete();
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (empresas) => {
          if (Array.isArray(empresas) && empresas.length > 0) {
            this.empresa = (targetId ? empresas.find(e => Number(e.id) === targetId) : null) || empresas[0];
            this.nombre = this.empresa.nombre || '';
            this.nit = this.empresa.nit || '';
            this.telefono = this.empresa.telefono || '';
            this.email = this.empresa.email || '';
            this.direccion = this.empresa.direccion || '';
            this.estado = this.empresa.estado || 'Activo';
            if (this.empresa.id) {
              this.cargarEstadoMembresia(this.empresa.id);
            }
          }
          this.cdr.detectChanges();
        },
        error: async (err) => {
          console.error('Error al cargar datos de la empresa:', err);
          const toast = await this.toastController.create({
            message: 'No se pudieron cargar los datos de la empresa.',
            duration: 3000,
            color: 'danger',
            position: 'top'
          });
          await toast.present();
          this.cdr.detectChanges();
        }
      });
  }

  cargarEstadoMembresia(empresaId: number): void {
    this.empresasService.getMembresiaEmpresa(empresaId).subscribe({
      next: (res) => {
        if (res?.empresa) {
          this.empresa = { ...this.empresa, ...res.empresa };
          this.authService.setEmpresaActiva(this.empresa, this.authService.getRolId());
        }
        this.pagosMembresia = Array.isArray(res?.historial_pagos) ? res.historial_pagos : [];
        this.cobroMembresiaActual = res?.cobro_pendiente || null;
        if (this.cobroMembresiaActual && this.cobroMembresiaActual.estado === 'PENDIENTE') {
          this.iniciarPollingMembresia(this.cobroMembresiaActual.id);
        }
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  async iniciarPagoMembresia(): Promise<void> {
    if (!this.empresa || !this.empresa.id || this.procesandoMembresia) return;

    this.procesandoMembresia = true;
    this.cdr.detectChanges();

    const payload: {
      canal: 'link' | 'datafono' | 'manual';
      id_metodo_pago?: number;
      id_terminal?: number;
      meses?: number;
      referencia_pago?: string;
    } = {
      canal: this.canalMembresia,
      meses: 1
    };

    if (this.canalMembresia === 'link' && this.idMetodoMembresia) {
      payload.id_metodo_pago = Number(this.idMetodoMembresia);
    } else if (this.canalMembresia === 'datafono' && this.idTerminalMembresia) {
      payload.id_terminal = Number(this.idTerminalMembresia);
    } else if (this.canalMembresia === 'manual' && this.referenciaManualMembresia.trim()) {
      payload.referencia_pago = this.referenciaManualMembresia.trim();
    }

    this.empresasService.crearCobroMembresia(this.empresa.id, payload)
      .pipe(
        finalize(() => {
          this.procesandoMembresia = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: async (res) => {
          if (res?.empresa) {
            this.empresa = { ...this.empresa, ...res.empresa };
            this.authService.setEmpresaActiva(this.empresa, this.authService.getRolId());
          }
          if (res?.cobro) {
            this.cobroMembresiaActual = res.cobro;
            this.pagosMembresia = [
              res.cobro,
              ...this.pagosMembresia.filter(p => p.id !== res.cobro.id)
            ];

            if (res.cobro.url_pago) {
              window.open(res.cobro.url_pago, '_blank');
            }

            if (res.cobro.estado === 'APROBADA') {
              this.referenciaManualMembresia = '';
              const toast = await this.toastController.create({
                message: '✅ ¡Membresía de $19.900 COP activada exitosamente por 30 días!',
                duration: 3500,
                color: 'success',
                position: 'top'
              });
              await toast.present();
            } else if (res.cobro.estado === 'PENDIENTE') {
              this.iniciarPollingMembresia(res.cobro.id);
              const toast = await this.toastController.create({
                message: '📡 Cobro de membresía ($19.900 COP) generado. Completa o simula el pago.',
                duration: 3500,
                color: 'primary',
                position: 'top'
              });
              await toast.present();
            }
          }
          this.cdr.detectChanges();
        },
        error: async (err) => {
          const toast = await this.toastController.create({
            message: err?.error?.mensaje || 'No se pudo iniciar el cobro de membresía ($19.900 COP).',
            duration: 3500,
            color: 'danger',
            position: 'top'
          });
          await toast.present();
          this.cdr.detectChanges();
        }
      });
  }

  abrirCheckoutMembresia(url?: string | null): void {
    const link = url || this.cobroMembresiaActual?.url_pago;
    if (link) {
      window.open(link, '_blank');
    }
  }

  simularResultadoMembresia(cobroId: number, resultado: 'APROBADA' | 'RECHAZADA'): void {
    if (this.procesandoMembresia) return;
    this.procesandoMembresia = true;
    this.cdr.detectChanges();

    this.empresasService.simularCobroMembresia(cobroId, resultado)
      .pipe(
        finalize(() => {
          this.procesandoMembresia = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: async (res) => {
          this.detenerPollingMembresia();
          if (res?.empresa) {
            this.empresa = { ...this.empresa, ...res.empresa };
            this.authService.setEmpresaActiva(this.empresa, this.authService.getRolId());
          }
          if (res?.cobro) {
            this.cobroMembresiaActual = res.cobro.estado === 'PENDIENTE' ? res.cobro : null;
            this.pagosMembresia = this.pagosMembresia.map(p => p.id === res.cobro.id ? res.cobro : p);
          }
          const toast = await this.toastController.create({
            message: resultado === 'APROBADA'
              ? '✅ ¡Pago de membresía por $19.900 COP aprobado! Vigencia extendida por 30 días.'
              : '⚠️ Cobro de membresía marcado como rechazado en el simulador.',
            duration: 3500,
            color: resultado === 'APROBADA' ? 'success' : 'warning',
            position: 'top'
          });
          await toast.present();
          this.cdr.detectChanges();
        },
        error: async (err) => {
          const toast = await this.toastController.create({
            message: err?.error?.mensaje || 'No se pudo simular el pago de membresía.',
            duration: 3000,
            color: 'danger',
            position: 'top'
          });
          await toast.present();
        }
      });
  }

  refrescarCobroMembresia(cobroId: number): void {
    this.empresasService.getCobroMembresia(cobroId).subscribe({
      next: async (res) => {
        if (res?.empresa) {
          this.empresa = { ...this.empresa, ...res.empresa };
          this.authService.setEmpresaActiva(this.empresa, this.authService.getRolId());
        }
        if (res?.cobro) {
          this.pagosMembresia = this.pagosMembresia.map(p => p.id === res.cobro.id ? res.cobro : p);
          if (res.cobro.estado === 'APROBADA') {
            this.detenerPollingMembresia();
            this.cobroMembresiaActual = null;
            const toast = await this.toastController.create({
              message: '✅ ¡Pago de membresía ($19.900 COP) confirmado por la pasarela!',
              duration: 3500,
              color: 'success',
              position: 'top'
            });
            await toast.present();
          } else if (res.cobro.estado !== 'PENDIENTE') {
            this.detenerPollingMembresia();
            this.cobroMembresiaActual = null;
          } else {
            this.cobroMembresiaActual = res.cobro;
          }
        }
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  private iniciarPollingMembresia(cobroId: number): void {
    this.detenerPollingMembresia();
    this.pollingMembresiaStart = Date.now();
    this.pollingMembresiaTimer = setInterval(() => {
      if (Date.now() - this.pollingMembresiaStart > 5 * 60 * 1000) {
        this.detenerPollingMembresia();
        return;
      }
      this.refrescarCobroMembresia(cobroId);
    }, 3000);
  }

  private detenerPollingMembresia(): void {
    if (this.pollingMembresiaTimer) {
      clearInterval(this.pollingMembresiaTimer);
      this.pollingMembresiaTimer = null;
    }
  }

  async guardarDatos(): Promise<void> {
    if (!this.empresa || !this.empresa.id) return;

    if (!this.nombre.trim() || !this.nit.trim()) {
      const toast = await this.toastController.create({
        message: 'El nombre y el NIT son campos obligatorios.',
        duration: 2500,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    this.guardando = true;
    this.cdr.detectChanges();

    const data: Partial<Empresa> = {
      nombre: this.nombre.trim(),
      nit: this.nit.trim(),
      telefono: this.telefono.trim(),
      email: this.email.trim(),
      direccion: this.direccion.trim()
    };

    this.empresasService.updateEmpresa(this.empresa.id, data)
      .pipe(
        finalize(() => {
          this.guardando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: async (res) => {
          this.empresa = res;
          this.authService.setEmpresaActiva(this.empresa, this.authService.getRolId());
          const toast = await this.toastController.create({
            message: '¡Datos de la empresa actualizados exitosamente!',
            duration: 3000,
            color: 'success',
            position: 'top'
          });
          await toast.present();
          this.cdr.detectChanges();
        },
        error: async (err) => {
          console.error('Error al guardar datos de la empresa:', err);
          const toast = await this.toastController.create({
            message: err?.error?.mensaje || 'Error al actualizar los datos de la empresa.',
            duration: 3500,
            color: 'danger',
            position: 'top'
          });
          await toast.present();
          this.cdr.detectChanges();
        }
      });
  }

  solicitarCambioEstado(): void {
    this.mostrarModalConfirmacionEstado = true;
    this.cdr.detectChanges();
  }

  cancelarCambioEstado(): void {
    this.mostrarModalConfirmacionEstado = false;
    this.cdr.detectChanges();
  }

  confirmarCambioEstado(): void {
    if (!this.empresa || !this.empresa.id) return;

    const nuevoEstado = this.estado === 'Activo' ? 'Inactivo' : 'Activo';
    this.cambiandoEstado = true;
    this.cdr.detectChanges();

    this.empresasService.updateEmpresa(this.empresa.id, { estado: nuevoEstado })
      .pipe(
        finalize(() => {
          this.cambiandoEstado = false;
          this.mostrarModalConfirmacionEstado = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: async (res) => {
          this.estado = res.estado || nuevoEstado;
          if (this.empresa) {
            this.empresa.estado = this.estado;
            this.authService.setEmpresaActiva(this.empresa, this.authService.getRolId());
          }
          this.cdr.detectChanges();

          const toast = await this.toastController.create({
            message: `Estado operativo actualizado: ${this.estado === 'Activo' ? 'Empresa Activa 🟢' : 'Empresa Pausada 🔴'}`,
            duration: 3500,
            color: this.estado === 'Activo' ? 'success' : 'dark',
            position: 'top'
          });
          await toast.present();
        },
        error: async (err) => {
          console.error('Error al cambiar estado operativo:', err);
          const toast = await this.toastController.create({
            message: 'Error al cambiar el estado operativo de la empresa.',
            duration: 3000,
            color: 'danger',
            position: 'top'
          });
          await toast.present();
          this.cdr.detectChanges();
        }
      });
  }
}
