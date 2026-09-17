import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastController } from '@ionic/angular/lazy';
import { AuthService } from '../../services/auth.service';
import { FacturasService, Factura } from '../../services/facturas.service';
import { ClientesService, Cliente } from '../../services/clientes.service';
import { MetodosPagoService, MetodoPago } from '../../services/metodos-pago.service';
import { MenuStateService } from '../../services/menu-state.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-facturas',
  templateUrl: './facturas.page.html',
  styleUrls: ['./facturas.page.scss'],
  standalone: false
})
export class FacturasPage implements OnInit, OnDestroy {
  activeTab: 'hub' | 'nueva' | 'listado' = 'hub';

  facturas: Factura[] = [];
  loading = false;
  usuario: any = null;
  currentPage = 1;
  totalPages = 1;
  hasMorePages = true;

  // Formulario nueva factura inteligente
  tipoDocumento = 'CC'; // Predeterminado C.C.
  documentoCliente = '';
  clienteNombre = '';
  clienteTelefono = '';
  clienteEmail = '';
  clienteDireccion = '';
  clienteId: number | null = null;
  clienteEncontrado = false;
  buscandoCliente = false;

  montoTotal: number | null = null;
  metodoPago = 'Efectivo';
  metodoPagoSeleccionadoId: number = 1;
  metodosPagoList: MetodoPago[] = [];
  guardando = false;

  // Modal detalle de factura
  facturaSeleccionada: Factura | null = null;
  mostrarModalDetalle = false;

  // Modal de confirmación personalizado tras crear
  mostrarModalConfirmacion = false;
  modalTitulo = '';
  modalMensaje = '';

  private queryParamsSub?: Subscription;

  constructor(
    private authService: AuthService,
    private facturasService: FacturasService,
    private clientesService: ClientesService,
    private metodosPagoService: MetodosPagoService,
    private router: Router,
    private route: ActivatedRoute,
    private menuStateService: MenuStateService,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.verificarAutenticacion();
    this.cargarMetodosPago();
    this.queryParamsSub = this.route.queryParamMap.subscribe((params) => {
      const tabParam = params.get('tab');
      const newTab = (tabParam === 'listado' || tabParam === 'nueva') ? tabParam : 'hub';
      const tabChanged = this.activeTab !== newTab;
      this.activeTab = newTab;

      if (this.activeTab === 'listado') {
        if (tabChanged || this.facturas.length === 0) {
          this.cargarFacturas(1, true);
        }
      }
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    if (this.queryParamsSub) {
      this.queryParamsSub.unsubscribe();
    }
  }

  ionViewWillEnter(): void {
    this.verificarAutenticacion();
    this.cargarMetodosPago();
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    const targetTab = (tabParam === 'listado' || tabParam === 'nueva') ? tabParam : 'hub';
    if (this.activeTab !== targetTab) {
      this.activeTab = targetTab;
      if (this.activeTab === 'listado') {
        this.cargarFacturas(1, true);
      }
      this.cdr.detectChanges();
    } else if (this.activeTab === 'listado' && this.facturas.length === 0 && !this.loading) {
      this.cargarFacturas(1, true);
    }
  }

  cargarMetodosPago(): void {
    const emp = this.authService.getEmpresaActiva();
    this.metodosPagoService.getMetodosPago(emp?.id).subscribe({
      next: (res) => {
        if (Array.isArray(res) && res.length > 0) {
          this.metodosPagoList = res;
          if (!this.metodoPagoSeleccionadoId || !this.metodosPagoList.some(m => m.id === this.metodoPagoSeleccionadoId)) {
            this.metodoPagoSeleccionadoId = this.metodosPagoList[0].id || 1;
            this.metodoPago = this.metodosPagoList[0].nombre;
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error cargando métodos de pago:', err)
    });
  }

  onMetodoPagoChange(idVal: any): void {
    const idNum = Number(idVal);
    this.metodoPagoSeleccionadoId = idNum;
    const found = this.metodosPagoList.find(m => m.id === idNum);
    if (found) {
      this.metodoPago = found.nombre;
    }
  }

  private verificarAutenticacion(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }
    this.usuario = this.authService.getUsuario();
  }

  toggleMenu(): void {
    this.menuStateService.toggle();
  }

  irAIndex(): void {
    this.router.navigateByUrl('/inicio');
  }

  cancelarOVolver(): void {
    if (this.activeTab === 'hub') {
      this.router.navigateByUrl('/inicio');
    } else {
      this.activeTab = 'hub';
      this.router.navigate([], { relativeTo: this.route, queryParams: {} });
      this.cdr.detectChanges();
    }
  }

  seleccionarAccion(accion: 'nueva' | 'listado'): void {
    this.activeTab = accion;
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab: accion } });
    if (accion === 'listado') {
      this.cargarFacturas(1, true);
    }
    this.cdr.detectChanges();
  }

  cargarFacturas(page: number = 1, isInitial: boolean = false, event?: any): void {
    if (isInitial) {
      this.loading = true;
      this.currentPage = page;
      this.facturas = [];
    }


    this.facturasService.getFacturas(page, 10).subscribe({
      next: (res) => {
        this.loading = false;
        if (event) event.target.complete();

        let newItems: Factura[] = [];
        if (Array.isArray(res)) {
          newItems = res;
          this.hasMorePages = false;
        } else if (res && res.items && Array.isArray(res.items)) {
          newItems = res.items;
          this.totalPages = res.total_pages || 1;
          this.hasMorePages = page < this.totalPages;
        } else {
          newItems = [];
          this.hasMorePages = false;
        }

        if (isInitial) {
          this.facturas = newItems;
        } else {
          this.facturas = [...this.facturas, ...newItems];
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        if (event) event.target.complete();
        console.error('Error al cargar facturas:', err);
        this.cdr.detectChanges();
      }
    });
  }

  cambiarPagina(delta: number): void {
    const targetPage = this.currentPage + delta;
    if (targetPage >= 1 && targetPage <= this.totalPages) {
      this.cargarFacturas(targetPage, true);
    }
  }

  loadMoreData(event: any): void {
    if (!this.hasMorePages) {
      event.target.disabled = true;
      event.target.complete();
      return;
    }
    this.currentPage++;
    this.cargarFacturas(this.currentPage, false, event);
  }

  handleRefresh(event: any): void {
    this.cargarFacturas(1, true, event);
  }

  async buscarClientePorDocumento(): Promise<void> {
    const doc = (this.documentoCliente || '').trim();
    if (!doc) {
      await this.mostrarToastSimple('Por favor ingresa un número de documento para consultar.', 'warning');
      return;
    }

    this.buscandoCliente = true;
    this.cdr.detectChanges();

    this.clientesService.buscarPorDocumento(doc).subscribe({
      next: async (cliente) => {
        this.buscandoCliente = false;
        if (cliente) {
          this.clienteEncontrado = true;
          this.clienteId = cliente.id || null;
          this.clienteNombre = cliente.nombre || '';
          this.tipoDocumento = cliente.tipo_documento || this.tipoDocumento;
          this.clienteTelefono = cliente.telefono || '';
          this.clienteEmail = cliente.email || '';
          this.clienteDireccion = cliente.direccion || '';
          await this.mostrarToastSimple('✅ Cliente verificado y vinculado a la factura', 'success');
        }
        this.cdr.detectChanges();
      },
      error: async (err) => {
        this.buscandoCliente = false;
        this.clienteEncontrado = false;
        this.clienteId = null;
        await this.mostrarToastSimple('ℹ️ Cliente no encontrado en el sistema. Puedes escribir su nombre para registrarlo automáticamente con esta venta.', 'warning');
        this.cdr.detectChanges();
      }
    });
  }

  limpiarCliente(): void {
    this.clienteEncontrado = false;
    this.clienteId = null;
    this.clienteNombre = '';
    this.clienteTelefono = '';
    this.clienteEmail = '';
    this.clienteDireccion = '';
    this.cdr.detectChanges();
  }

  verDetalleFactura(fact: Factura): void {
    this.facturaSeleccionada = fact;
    this.mostrarModalDetalle = true;
    this.cdr.detectChanges();
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle = false;
    this.facturaSeleccionada = null;
    this.cdr.detectChanges();
  }

  async onCrearFactura(): Promise<void> {
    if (!this.clienteNombre || !this.montoTotal || this.montoTotal <= 0) {
      await this.mostrarToastSimple('Por favor ingresa el nombre del cliente y un monto válido.', 'warning');
      return;
    }

    this.guardando = true;
    this.cdr.detectChanges();

    const payload: Partial<Factura> = {
      cliente_nombre: this.clienteNombre.trim(),
      documento_cliente: (this.documentoCliente || '').trim(),
      tipo_documento: this.tipoDocumento || 'CC',
      cliente_id: this.clienteId || undefined,
      id_cliente: this.clienteId || undefined,
      total: Number(this.montoTotal),
      id_metodo_pago: this.metodoPagoSeleccionadoId,
      metodo_pago: this.metodoPago,
      estado: 'Emitida'
    };

    this.facturasService.createFactura(payload).subscribe({
      next: (res) => {
        this.guardando = false;
        this.limpiarFormulario();
        this.modalTitulo = '¡Factura Registrada!';
        this.modalMensaje = 'La factura ha sido registrada con éxito. ¿Quieres ver el historial de facturas?';
        this.mostrarModalConfirmacion = true;
        this.cdr.detectChanges();
      },
      error: async (err) => {
        this.guardando = false;
        console.error('Error al emitir factura:', err);
        const msg = err?.error?.mensaje || 'No se pudo registrar la factura. Intenta nuevamente.';
        await this.mostrarToastSimple(msg, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  responderModal(verListado: boolean): void {
    this.mostrarModalConfirmacion = false;
    this.limpiarFormulario();
    if (verListado) {
      this.seleccionarAccion('listado');
    } else {
      this.activeTab = 'nueva';
    }
    this.cdr.detectChanges();
  }

  private limpiarFormulario(): void {
    this.tipoDocumento = 'CC';
    this.documentoCliente = '';
    this.clienteNombre = '';
    this.clienteTelefono = '';
    this.clienteEmail = '';
    this.clienteDireccion = '';
    this.clienteId = null;
    this.clienteEncontrado = false;
    this.buscandoCliente = false;
    this.montoTotal = null;
    if (this.metodosPagoList.length > 0) {
      this.metodoPagoSeleccionadoId = this.metodosPagoList[0].id || 1;
      this.metodoPago = this.metodosPagoList[0].nombre;
    } else {
      this.metodoPagoSeleccionadoId = 1;
      this.metodoPago = 'Efectivo';
    }
  }

  private async mostrarToastSimple(mensaje: string, color: string = 'primary'): Promise<void> {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3500,
      color: color,
      position: 'top'
    });
    await toast.present();
  }
}
