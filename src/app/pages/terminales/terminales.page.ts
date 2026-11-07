import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastController } from '@ionic/angular/lazy';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { MenuStateService } from '../../services/menu-state.service';
import { TerminalesService, TerminalPago, TerminalDisponible } from '../../services/terminales.service';
import { MetodosPagoService, MetodoPago } from '../../services/metodos-pago.service';
import { CobrosService } from '../../services/cobros.service';

@Component({
  selector: 'app-terminales',
  templateUrl: './terminales.page.html',
  styleUrls: ['./terminales.page.scss'],
  standalone: false
})
export class TerminalesPage implements OnInit {
  activeTab: 'terminales' | 'pasarelas' = 'terminales';
  empresaActiva: any = null;
  loading = false;

  // Terminales (Datáfonos)
  terminales: TerminalPago[] = [];
  terminalesDisponibles: TerminalDisponible[] = [];
  consultandoDisponibles = false;
  mostrarModalTerminal = false;
  guardandoTerminal = false;
  editandoTerminalId: number | null = null;
  formTerminal: {
    nombre: string;
    id_metodo_pago: number | null;
    terminal_serial: string;
    terminal_model: string;
    email_usuario: string;
    estado: string;
  } = {
    nombre: '',
    id_metodo_pago: null,
    terminal_serial: '',
    terminal_model: 'Bold Smart Pro',
    email_usuario: '',
    estado: 'Activo'
  };

  // Pasarelas / Métodos de Pago
  metodosPago: MetodoPago[] = [];
  mostrarModalMetodo = false;
  guardandoMetodo = false;
  editandoMetodoId: number | null = null;
  metodoEditandoActual: MetodoPago | null = null;
  formMetodo: {
    nombre: string;
    descripcion: string;
    tipo: string;
    banco: string;
    numero_cuenta: string;
    titular: string;
    pasarela: string;
    modo: string;
    api_key_publica: string;
    api_key_privada: string;
    webhook_secret: string;
    integrity_secret: string;
  } = {
    nombre: '',
    descripcion: '',
    tipo: 'Tarjeta',
    banco: '',
    numero_cuenta: '',
    titular: '',
    pasarela: 'simulado',
    modo: 'sandbox',
    api_key_publica: '',
    api_key_privada: '',
    webhook_secret: '',
    integrity_secret: ''
  };

  // Conciliación bajo demanda
  conciliando = false;
  resumenConciliacion: any = null;

  constructor(
    private authService: AuthService,
    private menuStateService: MenuStateService,
    private terminalesService: TerminalesService,
    private metodosPagoService: MetodosPagoService,
    private cobrosService: CobrosService,
    private router: Router,
    private route: ActivatedRoute,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.verificarAutenticacion();
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'pasarelas' || tab === 'terminales') {
      this.activeTab = tab;
    }
    this.cargarTodo();
  }

  ionViewWillEnter(): void {
    this.verificarAutenticacion();
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'pasarelas' || tab === 'terminales') {
      this.activeTab = tab;
    }
    this.cargarTodo();
  }

  private verificarAutenticacion(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }
    this.empresaActiva = this.authService.getEmpresaActiva();
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

  cambiarTab(tab: 'terminales' | 'pasarelas'): void {
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  get metodosParaDatafono(): MetodoPago[] {
    return this.metodosPago.filter(m => {
      const p = (m.pasarela || '').toLowerCase();
      return p === 'bold' || p === 'simulado';
    });
  }

  get pasarelaMetodoTerminalSeleccionado(): string {
    const m = this.metodosPago.find(x => x.id === Number(this.formTerminal.id_metodo_pago));
    return (m?.pasarela || 'simulado').toLowerCase();
  }

  cargarTodo(event?: any): void {
    this.loading = true;
    this.empresaActiva = this.authService.getEmpresaActiva();
    const empId = this.empresaActiva?.id;

    this.metodosPagoService.getMetodosPago(empId).subscribe({
      next: (metodos) => {
        this.metodosPago = Array.isArray(metodos) ? metodos : [];
        this.cargarTerminales(empId, event);
      },
      error: () => {
        this.cargarTerminales(empId, event);
      }
    });
  }

  private cargarTerminales(empId?: number, event?: any): void {
    this.terminalesService.getTerminales(empId, false)
      .pipe(
        finalize(() => {
          this.loading = false;
          if (event) event.target.complete();
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (lista) => {
          this.terminales = Array.isArray(lista) ? lista : [];
          this.cdr.detectChanges();
        },
        error: async (err) => {
          console.error('Error al cargar terminales:', err);
          await this.mostrarToast('No se pudieron cargar las terminales de pago.', 'danger');
        }
      });
  }

  // ==========================================
  // GESTIÓN DE TERMINALES (DATÁFONOS)
  // ==========================================
  abrirModalNuevaTerminal(): void {
    this.editandoTerminalId = null;
    this.terminalesDisponibles = [];
    const metodosCompatibles = this.metodosParaDatafono;
    const defaultMetodo = metodosCompatibles.length > 0 ? metodosCompatibles[0].id! : null;

    this.formTerminal = {
      nombre: `Caja ${this.terminales.length + 1} - Datáfono`,
      id_metodo_pago: defaultMetodo,
      terminal_serial: defaultMetodo ? `SIM-000${this.terminales.length + 1}` : '',
      terminal_model: 'Bold Smart Pro',
      email_usuario: this.empresaActiva?.email || 'caja@pymesoft.co',
      estado: 'Activo'
    };
    this.mostrarModalTerminal = true;
    this.cdr.detectChanges();
  }

  abrirModalEditarTerminal(term: TerminalPago): void {
    this.editandoTerminalId = term.id || null;
    this.terminalesDisponibles = [];
    this.formTerminal = {
      nombre: term.nombre || '',
      id_metodo_pago: term.id_metodo_pago,
      terminal_serial: term.terminal_serial || '',
      terminal_model: term.terminal_model || 'Bold Smart Pro',
      email_usuario: term.email_usuario || '',
      estado: term.estado || 'Activo'
    };
    this.mostrarModalTerminal = true;
    this.cdr.detectChanges();
  }

  cerrarModalTerminal(): void {
    if (this.guardandoTerminal) return;
    this.mostrarModalTerminal = false;
    this.cdr.detectChanges();
  }

  consultarDispositivosDisponibles(): void {
    if (!this.formTerminal.id_metodo_pago) {
      this.mostrarToast('Selecciona primero el método de pago integrado (Bold o Simulado).', 'warning');
      return;
    }
    this.consultandoDisponibles = true;
    this.cdr.detectChanges();

    this.terminalesService.getTerminalesDisponibles(Number(this.formTerminal.id_metodo_pago), this.empresaActiva?.id)
      .pipe(
        finalize(() => {
          this.consultandoDisponibles = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: async (res) => {
          this.terminalesDisponibles = res?.terminales || [];
          if (this.terminalesDisponibles.length === 0) {
            await this.mostrarToast('No se encontraron datáfonos vinculados en la cuenta.', 'warning');
          } else {
            await this.mostrarToast(`Se encontraron ${this.terminalesDisponibles.length} datáfono(s) disponible(s). Toca uno para seleccionarlo.`, 'success');
          }
        },
        error: async (err) => {
          const msg = err?.error?.mensaje || 'No se pudieron consultar los datáfonos disponibles.';
          await this.mostrarToast(msg, 'danger');
        }
      });
  }

  seleccionarDispositivoDisponible(disp: TerminalDisponible): void {
    this.formTerminal.terminal_serial = disp.terminal_serial || '';
    this.formTerminal.terminal_model = disp.terminal_model || 'Bold Smart Pro';
    if (!this.formTerminal.nombre.trim() && disp.name) {
      this.formTerminal.nombre = disp.name;
    }
    this.cdr.detectChanges();
  }

  async guardarTerminal(): Promise<void> {
    if (!this.formTerminal.nombre.trim()) {
      await this.mostrarToast('Ingresa un nombre para identificar la terminal (ej. Caja 1).', 'warning');
      return;
    }
    if (!this.formTerminal.id_metodo_pago) {
      await this.mostrarToast('Selecciona un método de pago integrado (Bold o Simulado).', 'warning');
      return;
    }
    if (this.pasarelaMetodoTerminalSeleccionado === 'bold') {
      if (!this.formTerminal.terminal_serial.trim() || !this.formTerminal.terminal_model.trim()) {
        await this.mostrarToast('Para datáfonos Bold debes indicar el serial y el modelo del equipo.', 'warning');
        return;
      }
      if (!this.formTerminal.email_usuario.trim()) {
        await this.mostrarToast('Para Bold debes indicar el correo del usuario que opera el datáfono.', 'warning');
        return;
      }
    }

    this.guardandoTerminal = true;
    this.cdr.detectChanges();

    const payload: Partial<TerminalPago> = {
      id_empresa: this.empresaActiva?.id || 1,
      nombre: this.formTerminal.nombre.trim(),
      id_metodo_pago: Number(this.formTerminal.id_metodo_pago),
      terminal_serial: this.formTerminal.terminal_serial.trim() || 'SIM-0001',
      terminal_model: this.formTerminal.terminal_model.trim() || 'Bold Smart Pro',
      email_usuario: this.formTerminal.email_usuario.trim() || undefined,
      estado: this.formTerminal.estado
    };

    const req$ = this.editandoTerminalId
      ? this.terminalesService.updateTerminal(this.editandoTerminalId, payload)
      : this.terminalesService.createTerminal(payload);

    req$.pipe(
      finalize(() => {
        this.guardandoTerminal = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: async () => {
        this.mostrarModalTerminal = false;
        this.cargarTodo();
        await this.mostrarToast(
          this.editandoTerminalId ? '✅ Terminal actualizada correctamente.' : '✅ Terminal de pago agregada y activa.',
          'success'
        );
      },
      error: async (err) => {
        const msg = err?.error?.mensaje || 'Error al guardar la terminal de pago.';
        await this.mostrarToast(msg, 'danger');
      }
    });
  }

  cambiarEstadoTerminal(term: TerminalPago): void {
    if (!term.id) return;
    const nuevoEstado = term.estado === 'Activo' ? 'Inactivo' : 'Activo';
    this.terminalesService.updateTerminal(term.id, { estado: nuevoEstado }).subscribe({
      next: async (actualizada) => {
        term.estado = actualizada.estado || nuevoEstado;
        this.cdr.detectChanges();
        await this.mostrarToast(
          `Terminal "${term.nombre}" ahora está ${term.estado === 'Activo' ? 'Activa 🟢' : 'Inactiva 🔴'}.`,
          term.estado === 'Activo' ? 'success' : 'medium'
        );
      },
      error: async (err) => {
        const msg = err?.error?.mensaje || 'No se pudo cambiar el estado de la terminal.';
        await this.mostrarToast(msg, 'danger');
      }
    });
  }

  // ==========================================
  // GESTIÓN DE PASARELAS / MÉTODOS DE PAGO
  // ==========================================
  abrirModalNuevoMetodo(pasarelaInicial: 'simulado' | 'bold' | 'wompi' | 'ninguna' = 'simulado'): void {
    this.editandoMetodoId = null;
    this.metodoEditandoActual = null;
    const nombreSugerido =
      pasarelaInicial === 'bold'
        ? 'Datáfono Bold'
        : pasarelaInicial === 'wompi'
          ? 'Link de Pago Wompi (PSE / Nequi / Tarjeta)'
          : pasarelaInicial === 'simulado'
            ? 'Pasarela / Datáfono (Modo Pruebas)'
            : '';

    this.formMetodo = {
      nombre: nombreSugerido,
      descripcion: '',
      tipo: pasarelaInicial === 'wompi' ? 'Pasarela' : 'Tarjeta',
      banco: pasarelaInicial === 'bold' ? 'Bold' : pasarelaInicial === 'wompi' ? 'Wompi Bancolombia' : '',
      numero_cuenta: '',
      titular: '',
      pasarela: pasarelaInicial,
      modo: 'sandbox',
      api_key_publica: '',
      api_key_privada: '',
      webhook_secret: '',
      integrity_secret: ''
    };
    this.mostrarModalMetodo = true;
    this.cdr.detectChanges();
  }

  abrirModalEditarMetodo(m: MetodoPago): void {
    this.editandoMetodoId = m.id || null;
    this.metodoEditandoActual = m;
    this.formMetodo = {
      nombre: m.nombre || '',
      descripcion: m.descripcion || '',
      tipo: m.tipo || 'Tarjeta',
      banco: m.banco || '',
      numero_cuenta: m.numero_cuenta || '',
      titular: m.titular || '',
      pasarela: m.pasarela || 'ninguna',
      modo: m.modo || 'sandbox',
      api_key_publica: m.api_key_publica || '',
      api_key_privada: '',
      webhook_secret: '',
      integrity_secret: ''
    };
    this.mostrarModalMetodo = true;
    this.cdr.detectChanges();
  }

  cerrarModalMetodo(): void {
    if (this.guardandoMetodo) return;
    this.mostrarModalMetodo = false;
    this.cdr.detectChanges();
  }

  onPasarelaFormChange(pasarela: string): void {
    if (pasarela === 'simulado') {
      this.formMetodo.modo = 'sandbox';
    }
    if (pasarela === 'wompi') {
      this.formMetodo.tipo = 'Pasarela';
    } else if (pasarela === 'bold') {
      this.formMetodo.tipo = 'Tarjeta';
    }
    this.cdr.detectChanges();
  }

  async guardarMetodo(): Promise<void> {
    if (!this.formMetodo.nombre.trim()) {
      await this.mostrarToast('El nombre del método de pago es obligatorio.', 'warning');
      return;
    }

    this.guardandoMetodo = true;
    this.cdr.detectChanges();

    const payload: Partial<MetodoPago> = {
      id_empresa: this.empresaActiva?.id || 1,
      nombre: this.formMetodo.nombre.trim(),
      descripcion: this.formMetodo.descripcion.trim() || undefined,
      tipo: this.formMetodo.tipo,
      banco: this.formMetodo.banco.trim() || undefined,
      numero_cuenta: this.formMetodo.numero_cuenta.trim() || undefined,
      titular: this.formMetodo.titular.trim() || undefined,
      pasarela: this.formMetodo.pasarela,
      modo: this.formMetodo.pasarela === 'simulado' ? 'sandbox' : this.formMetodo.modo,
      api_key_publica: this.formMetodo.api_key_publica.trim() || undefined
    };

    if (this.formMetodo.api_key_privada.trim()) {
      payload.api_key_privada = this.formMetodo.api_key_privada.trim();
    }
    if (this.formMetodo.webhook_secret.trim()) {
      payload.webhook_secret = this.formMetodo.webhook_secret.trim();
    }
    if (this.formMetodo.integrity_secret.trim()) {
      payload.integrity_secret = this.formMetodo.integrity_secret.trim();
    }

    const req$ = this.editandoMetodoId
      ? this.metodosPagoService.updateMetodoPago(this.editandoMetodoId, payload)
      : this.metodosPagoService.createMetodoPago(payload);

    req$.pipe(
      finalize(() => {
        this.guardandoMetodo = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: async () => {
        this.mostrarModalMetodo = false;
        this.cargarTodo();
        await this.mostrarToast(
          this.editandoMetodoId ? '✅ Pasarela / método actualizado.' : '✅ Nuevo método de pago registrado.',
          'success'
        );
      },
      error: async (err) => {
        const msg = err?.error?.mensaje || err?.error?.error || 'Error al guardar el método de pago.';
        await this.mostrarToast(msg, 'danger');
      }
    });
  }

  eliminarMetodo(m: MetodoPago): void {
    if (!m.id || m.es_global) return;
    this.metodosPagoService.deleteMetodoPago(m.id).subscribe({
      next: async () => {
        this.cargarTodo();
        await this.mostrarToast('Método de pago desactivado.', 'success');
      },
      error: async (err) => {
        const msg = err?.error?.error || 'No se pudo desactivar el método de pago.';
        await this.mostrarToast(msg, 'danger');
      }
    });
  }

  // ==========================================
  // CONCILIACIÓN DE PAGOS PENDIENTES
  // ==========================================
  ejecutarConciliacion(): void {
    this.conciliando = true;
    this.cdr.detectChanges();

    this.cobrosService.conciliarCobros({ empresa_id: this.empresaActiva?.id })
      .pipe(
        finalize(() => {
          this.conciliando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: async (res) => {
          this.resumenConciliacion = res;
          await this.mostrarToast(
            `Conciliación completada: ${res.revisadas || 0} cobro(s) pendiente(s) revisado(s).`,
            'success'
          );
        },
        error: async (err) => {
          const msg = err?.error?.mensaje || 'No se pudo ejecutar la conciliación.';
          await this.mostrarToast(msg, 'danger');
        }
      });
  }

  private async mostrarToast(mensaje: string, color: string = 'primary'): Promise<void> {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3200,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
