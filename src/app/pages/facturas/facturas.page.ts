import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastController } from '@ionic/angular/lazy';
import { AuthService } from '../../services/auth.service';
import { FacturasService, Factura } from '../../services/facturas.service';
import { ClientesService, Cliente } from '../../services/clientes.service';
import { MetodosPagoService, MetodoPago } from '../../services/metodos-pago.service';
import { ProductosService, Producto } from '../../services/productos.service';
import { TerminalesService, TerminalPago } from '../../services/terminales.service';
import { CobrosService, CobroTransaccion } from '../../services/cobros.service';
import { MenuStateService } from '../../services/menu-state.service';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

export interface ItemFactura {
  id_producto: number;
  codigo?: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  stock_disponible: number;
}

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
  empresaActiva: any = null;
  esAdmin = false;
  currentPage = 1;
  totalPages = 1;
  hasMorePages = true;

  // Formulario nueva factura inteligente - Cliente
  tipoDocumento = 'CC'; // Predeterminado C.C.
  documentoCliente = '';
  clienteNombre = '';
  clienteTelefono = '';
  clienteEmail = '';
  clienteDireccion = '';
  clienteId: number | null = null;
  clienteEncontrado = false;
  buscandoCliente = false;

  // Catálogo de Productos y Canasta de Venta
  productosDisponibles: Producto[] = [];
  cargandoProductos = false;
  idProductoSeleccionado: number | null = null;
  productoSeleccionadoObj: Producto | null = null;
  cantidadSeleccionada: number = 1;
  precioSeleccionado: number = 0;
  itemsFactura: ItemFactura[] = [];

  // Liquidación Financiera
  subtotalVenta: number = 0;
  ivaVenta: number = 0;
  totalVenta: number = 0;

  // Métodos de Pago
  metodoPago = 'Efectivo';
  metodoPagoSeleccionadoId: number = 1;
  metodosPagoList: MetodoPago[] = [
    { id: 1, nombre: 'Efectivo', tipo: 'Efectivo', pasarela: 'ninguna', integrado: false },
    { id: 2, nombre: 'Transferencia Bancaria / Nequi', tipo: 'Transferencia', banco: 'Bancolombia / Nequi', pasarela: 'ninguna', integrado: false },
    { id: 3, nombre: 'Datáfono Bold (Simulado)', tipo: 'Tarjeta', banco: 'Bold POS', pasarela: 'simulado', integrado: true },
    { id: 4, nombre: 'Pasarela Wompi / PSE / Nequi (Simulado)', tipo: 'Pasarela', banco: 'Wompi Bancolombia', pasarela: 'simulado', integrado: true }
  ];
  guardando = false;

  // Modal detalle de factura
  facturaSeleccionada: Factura | null = null;
  cargandoDetalle = false;
  mostrarModalDetalle = false;
  cobrosFacturaSeleccionada: CobroTransaccion[] = [];

  // Anulación / Cancelación de Factura (Admin)
  cancelandoFactura = false;
  mostrarModalConfirmacionCancelar = false;
  facturaParaCancelar: Factura | null = null;

  // Modal de confirmación personalizado tras crear
  mostrarModalConfirmacion = false;
  modalTitulo = '';
  modalMensaje = '';

  // COBRO AUTOMATIZADO EN TERMINAL (DATÁFONO BOLD) Y PASARELA (WOMPI / SIMULADO)
  mostrarModalPasarela = false;
  procesandoPagoPasarela = false;
  pasarelaModo: 'emision' | 'cobro_existente' = 'emision';
  facturaACobrar: Factura | null = null;
  montoAPagarPasarela: number = 0;
  canalCobro: 'datafono' | 'link' = 'datafono';
  terminalesActivas: TerminalPago[] = [
    { id: 1, nombre: 'Caja Principal - Datáfono 1', proveedor: 'simulado', id_metodo_pago: 3, terminal_serial: 'SIM-0001', terminal_model: 'Bold Smart Pro', estado: 'Activo' },
    { id: 2, nombre: 'Caja Auxiliar - Datáfono 2', proveedor: 'simulado', id_metodo_pago: 3, terminal_serial: 'SIM-0002', terminal_model: 'Bold Smart', estado: 'Activo' }
  ];
  idTerminalSeleccionada: number | null = 1;
  idMetodoLinkSeleccionado: number | null = 4;
  cobroActual: CobroTransaccion | null = null;

  private pollingTimer: any = null;
  private pollingStartedAt = 0;
  private queryParamsSub?: Subscription;

  constructor(
    private authService: AuthService,
    private facturasService: FacturasService,
    private clientesService: ClientesService,
    private metodosPagoService: MetodosPagoService,
    private productosService: ProductosService,
    private terminalesService: TerminalesService,
    private cobrosService: CobrosService,
    private router: Router,
    private route: ActivatedRoute,
    private menuStateService: MenuStateService,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.verificarAutenticacion();
    this.cargarMetodosPago();
    this.cargarTerminalesActivas();
    this.cargarProductos();

    this.queryParamsSub = this.route.queryParamMap.subscribe((params) => {
      const tabParam = params.get('tab');
      const newTab = (tabParam === 'listado' || tabParam === 'nueva') ? tabParam : 'hub';
      const tabChanged = this.activeTab !== newTab;
      this.activeTab = newTab;

      if (this.activeTab === 'nueva') {
        if (this.productosDisponibles.length === 0) {
          this.cargarProductos();
        }
      } else if (this.activeTab === 'listado') {
        if (tabChanged || this.facturas.length === 0) {
          this.cargarFacturas(1, true);
        }
      }
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.detenerPollingCobro();
    if (this.queryParamsSub) {
      this.queryParamsSub.unsubscribe();
    }
  }

  ionViewWillEnter(): void {
    this.verificarAutenticacion();
    this.cargarMetodosPago();
    this.cargarTerminalesActivas();
    this.cargarProductos();

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

  get metodoSeleccionadoObj(): MetodoPago | undefined {
    return this.metodosPagoList.find(m => m.id === Number(this.metodoPagoSeleccionadoId));
  }

  get esMetodoSeleccionadoIntegrado(): boolean {
    const m = this.metodoSeleccionadoObj;
    if (!m) return false;
    const p = (m.pasarela || 'ninguna').toLowerCase();
    return Boolean(m.integrado || p === 'bold' || p === 'wompi' || p === 'simulado');
  }

  get metodosLinkDisponibles(): MetodoPago[] {
    return this.metodosPagoList.filter(m => {
      const p = (m.pasarela || '').toLowerCase();
      return p === 'wompi' || p === 'simulado';
    });
  }

  cargarProductos(): void {
    const emp = this.authService.getEmpresaActiva();
    this.cargandoProductos = true;
    this.productosService.getProductos(1, 100, emp?.id).pipe(
      finalize(() => {
        this.cargandoProductos = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (res) => {
        if (Array.isArray(res)) {
          this.productosDisponibles = res;
        } else if (res && Array.isArray(res.items)) {
          this.productosDisponibles = res.items;
        } else if (res && Array.isArray(res.data)) {
          this.productosDisponibles = res.data;
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar productos para facturas:', err)
    });
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
          const links = this.metodosLinkDisponibles;
          if (links.length > 0 && !this.idMetodoLinkSeleccionado) {
            this.idMetodoLinkSeleccionado = links[0].id || null;
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error cargando métodos de pago:', err)
    });
  }

  cargarTerminalesActivas(): void {
    const emp = this.authService.getEmpresaActiva();
    this.terminalesService.getTerminales(emp?.id, true).subscribe({
      next: (lista) => {
        if (Array.isArray(lista) && lista.length > 0) {
          this.terminalesActivas = lista;
          if (!this.idTerminalSeleccionada || !this.terminalesActivas.some(t => t.id === this.idTerminalSeleccionada)) {
            this.idTerminalSeleccionada = this.terminalesActivas[0].id || 1;
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error cargando terminales de pago:', err)
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
    this.empresaActiva = this.authService.getEmpresaActiva();
    this.esAdmin = this.authService.hasRole([1]) ||
      (this.usuario?.rol === 'Administrador') ||
      (Number(this.usuario?.id_rol) === 1);
  }

  toggleMenu(): void {
    this.menuStateService.toggle();
  }

  irAIndex(): void {
    this.router.navigateByUrl('/inicio');
  }

  irAConfigurarTerminales(): void {
    this.cerrarModalPasarela();
    this.router.navigateByUrl('/terminales');
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
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: accion },
      queryParamsHandling: 'merge'
    });
    if (accion === 'listado') {
      this.cargarFacturas(1, true);
    } else if (accion === 'nueva') {
      if (this.productosDisponibles.length === 0) {
        this.cargarProductos();
      }
    }
    this.cdr.detectChanges();
  }

  cargarFacturas(page: number = 1, reset: boolean = false, event?: any): void {
    if (reset) {
      this.loading = true;
      this.currentPage = 1;
    }

    const emp = this.authService.getEmpresaActiva();
    this.facturasService.getFacturas(page, 15, emp?.id).subscribe({
      next: (res) => {
        let nuevasFacturas: Factura[] = [];
        if (Array.isArray(res)) {
          nuevasFacturas = res;
          this.totalPages = 1;
          this.hasMorePages = false;
        } else if (res && Array.isArray(res.items)) {
          nuevasFacturas = res.items;
          this.totalPages = res.total_pages || 1;
          this.currentPage = res.page || page;
          this.hasMorePages = this.currentPage < this.totalPages;
        }

        if (reset) {
          this.facturas = nuevasFacturas;
          this.loading = false;
        } else {
          this.facturas = [...this.facturas, ...nuevasFacturas];
        }

        if (event) {
          event.target.complete();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando facturas:', err);
        this.loading = false;
        if (event) {
          event.target.complete();
        }
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
    this.cargarProductos();
    this.cargarTerminalesActivas();
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
      error: async () => {
        this.buscandoCliente = false;
        this.clienteEncontrado = false;
        this.clienteId = null;
        await this.mostrarToastSimple('ℹ️ Cliente no registrado. Ingresa su nombre para registrarlo automáticamente.', 'warning');
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

  // GESTIÓN DE PRODUCTOS Y CANASTA DE COMPRA
  onProductoSeleccionadoChange(): void {
    if (!this.idProductoSeleccionado) {
      this.productoSeleccionadoObj = null;
      this.precioSeleccionado = 0;
      this.cantidadSeleccionada = 1;
      return;
    }
    const prod = this.productosDisponibles.find(p => p.id == this.idProductoSeleccionado);
    if (prod) {
      this.productoSeleccionadoObj = prod;
      this.precioSeleccionado = Number(prod.precio || 0);
      this.cantidadSeleccionada = 1;
    }
  }

  async agregarItemAFactura(): Promise<void> {
    if (!this.productoSeleccionadoObj || !this.idProductoSeleccionado) {
      await this.mostrarToastSimple('Selecciona un producto del catálogo.', 'warning');
      return;
    }

    const stockActual = Number(this.productoSeleccionadoObj.stock || 0);
    if (stockActual <= 0) {
      await this.mostrarToastSimple(`⚠️ "${this.productoSeleccionadoObj.nombre}" está agotado (Stock: 0).`, 'danger');
      return;
    }

    const cant = Number(this.cantidadSeleccionada) || 1;
    if (cant <= 0) {
      await this.mostrarToastSimple('La cantidad debe ser mayor a 0.', 'warning');
      return;
    }

    const itemExistente = this.itemsFactura.find(i => i.id_producto === this.idProductoSeleccionado);
    const cantYaEnCanasta = itemExistente ? itemExistente.cantidad : 0;
    const nuevaCantTotal = cantYaEnCanasta + cant;

    if (nuevaCantTotal > stockActual) {
      await this.mostrarToastSimple(`No puedes superar el inventario disponible (${stockActual} unidades disponibles).`, 'warning');
      return;
    }

    const precio = Number(this.precioSeleccionado || this.productoSeleccionadoObj.precio || 0);

    if (itemExistente) {
      itemExistente.cantidad = nuevaCantTotal;
      itemExistente.subtotal = Math.round((nuevaCantTotal * precio) * 100) / 100;
    } else {
      this.itemsFactura.push({
        id_producto: this.productoSeleccionadoObj.id!,
        codigo: this.productoSeleccionadoObj.codigo,
        nombre: this.productoSeleccionadoObj.nombre,
        cantidad: cant,
        precio_unitario: precio,
        subtotal: Math.round((cant * precio) * 100) / 100,
        stock_disponible: stockActual
      });
    }

    this.recalcularTotales();

    // Resetear selector
    this.idProductoSeleccionado = null;
    this.productoSeleccionadoObj = null;
    this.precioSeleccionado = 0;
    this.cantidadSeleccionada = 1;
    this.cdr.detectChanges();
    await this.mostrarToastSimple('Producto agregado a la canasta de venta', 'success');
  }

  incrementarItem(idx: number): void {
    const it = this.itemsFactura[idx];
    if (it.cantidad + 1 > it.stock_disponible) {
      this.mostrarToastSimple(`Stock máximo alcanzado (${it.stock_disponible} und).`, 'warning');
      return;
    }
    it.cantidad++;
    it.subtotal = Math.round((it.cantidad * it.precio_unitario) * 100) / 100;
    this.recalcularTotales();
  }

  decrementarItem(idx: number): void {
    const it = this.itemsFactura[idx];
    if (it.cantidad > 1) {
      it.cantidad--;
      it.subtotal = Math.round((it.cantidad * it.precio_unitario) * 100) / 100;
      this.recalcularTotales();
    } else {
      this.eliminarItem(idx);
    }
  }

  eliminarItem(idx: number): void {
    this.itemsFactura.splice(idx, 1);
    this.recalcularTotales();
  }

  recalcularTotales(): void {
    this.subtotalVenta = this.itemsFactura.reduce((acc, it) => acc + it.subtotal, 0);
    this.subtotalVenta = Math.round(this.subtotalVenta * 100) / 100;
    this.ivaVenta = Math.round((this.subtotalVenta * 0.19) * 100) / 100;
    this.totalVenta = Math.round((this.subtotalVenta + this.ivaVenta) * 100) / 100;
    this.cdr.detectChanges();
  }

  // EMISIÓN DE FACTURA
  async onCrearFactura(): Promise<void> {
    // Si el usuario seleccionó un producto en el selector pero olvidó tocar "Agregar a la Canasta", agregarlo automáticamente
    if (this.itemsFactura.length === 0 && this.productoSeleccionadoObj && this.idProductoSeleccionado) {
      await this.agregarItemAFactura();
    }

    if (this.itemsFactura.length === 0) {
      await this.mostrarToastSimple('Debes seleccionar y agregar al menos un producto a la factura.', 'warning');
      return;
    }

    if (!this.clienteNombre.trim()) {
      this.clienteNombre = 'Consumidor Final';
    }
    if (!this.documentoCliente.trim()) {
      this.documentoCliente = '222222222222';
    }

    const metodo = this.metodoSeleccionadoObj;
    const nombreMetodoLower = (metodo?.nombre || this.metodoPago || '').toLowerCase();

    if (this.esMetodoSeleccionadoIntegrado) {
      // Con pasarela / terminal integrada: primero emitir la factura como 'Emitida' y luego lanzar el cobro real
      this.guardarFacturaEnBackend('Emitida', undefined, undefined, true);
      return;
    }

    // Emisión directa para Efectivo / Transferencia: Se liquida como 'Pagada'
    const refDirecta = nombreMetodoLower.includes('efectivo') ? 'PAGO-EFECTIVO' : 'TRANSF-DIRECTA';
    this.guardarFacturaEnBackend('Pagada', undefined, refDirecta, false);
  }

  private guardarFacturaEnBackend(
    estado: string,
    pasarela?: string,
    referencia?: string,
    abrirCobroAlEmitir: boolean = false
  ): void {
    this.guardando = true;
    this.cdr.detectChanges();

    const emp = this.authService.getEmpresaActiva();
    const payload: any = {
      cliente_nombre: this.clienteNombre.trim(),
      documento_cliente: (this.documentoCliente || '').trim(),
      tipo_documento: this.tipoDocumento || 'CC',
      telefono_cliente: this.clienteTelefono ? this.clienteTelefono.trim() : undefined,
      email_cliente: this.clienteEmail ? this.clienteEmail.trim() : undefined,
      direccion_cliente: this.clienteDireccion ? this.clienteDireccion.trim() : undefined,
      cliente_id: this.clienteId || undefined,
      id_cliente: this.clienteId || undefined,
      id_empresa: emp?.id || 1,
      subtotal: this.subtotalVenta,
      iva: this.ivaVenta,
      descuento: 0,
      total: this.totalVenta,
      id_metodo_pago: this.metodoPagoSeleccionadoId,
      metodo_pago: this.metodoPago,
      estado: estado,
      pasarela: pasarela || null,
      referencia_pago: referencia || null,
      detalles: this.itemsFactura.map(it => ({
        id_producto: it.id_producto,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
        subtotal: it.subtotal
      }))
    };

    this.facturasService.createFactura(payload).subscribe({
      next: (facturaCreada) => {
        this.guardando = false;
        if (abrirCobroAlEmitir && facturaCreada && facturaCreada.id) {
          const metodoSel = this.metodoSeleccionadoObj;
          this.limpiarFormulario();
          this.abrirPasarelaCobro(facturaCreada, 'emision', metodoSel);
          return;
        }

        this.limpiarFormulario();
        this.modalTitulo = estado === 'Pagada' ? '¡Factura Pagada y Emitida!' : '¡Factura Emitida!';
        this.modalMensaje = estado === 'Pagada'
          ? (pasarela
              ? `Factura liquidada exitosamente mediante pasarela (${pasarela?.toUpperCase() || 'Digital'}). Referencia: ${referencia}. El inventario ha sido actualizado en tiempo real.`
              : `Factura emitida y pagada con éxito (${this.metodoPago || 'Efectivo'}). Referencia: ${referencia}. El inventario ha sido descontado en tiempo real.`)
          : 'La factura ha sido registrada en el sistema y el inventario descontado. ¿Quieres ver el historial de facturas?';
        this.mostrarModalConfirmacion = true;
        this.cdr.detectChanges();
      },
      error: async (err) => {
        this.guardando = false;
        console.error('Error al emitir factura:', err);
        const msg = err?.error?.mensaje || 'No se pudo emitir la factura. Verifica los datos.';
        await this.mostrarToastSimple(msg, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  // ANULACIÓN / CANCELACIÓN DE FACTURA (ADMIN)
  solicitarCancelarFactura(factura: Factura): void {
    if (!this.esAdmin) return;
    this.facturaParaCancelar = factura;
    this.mostrarModalConfirmacionCancelar = true;
    this.cdr.detectChanges();
  }

  cerrarModalConfirmacionCancelar(): void {
    this.mostrarModalConfirmacionCancelar = false;
    this.facturaParaCancelar = null;
    this.cdr.detectChanges();
  }

  confirmarCancelarFactura(): void {
    if (!this.facturaParaCancelar || !this.facturaParaCancelar.id) return;
    this.cancelandoFactura = true;
    this.cdr.detectChanges();

    this.facturasService.cancelarFactura(this.facturaParaCancelar.id).subscribe({
      next: async () => {
        this.cancelandoFactura = false;
        this.mostrarModalConfirmacionCancelar = false;
        if (this.facturaSeleccionada) {
          this.facturaSeleccionada.estado = 'Cancelada';
        }
        const itemEnLista = this.facturas.find(f => f.id === this.facturaParaCancelar?.id);
        if (itemEnLista) {
          itemEnLista.estado = 'Cancelada';
        }
        await this.mostrarToastSimple('Factura anulada correctamente y stock devuelto a inventario.', 'success');
        this.cdr.detectChanges();
      },
      error: async (err) => {
        this.cancelandoFactura = false;
        this.mostrarModalConfirmacionCancelar = false;
        const msg = err?.error?.mensaje || 'No se pudo anular la factura.';
        await this.mostrarToastSimple(msg, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  // =========================================================
  // COBRO AUTOMATIZADO (DATÁFONO BOLD / LINK WOMPI / SIMULADO)
  // =========================================================
  abrirPasarelaCobro(
    factura: Factura,
    modo: 'emision' | 'cobro_existente' = 'cobro_existente',
    metodoPreferido?: MetodoPago
  ): void {
    this.detenerPollingCobro();
    this.facturaACobrar = factura;
    this.pasarelaModo = modo;
    this.montoAPagarPasarela = Number(factura.total || 0);
    this.cobroActual = null;
    this.procesandoPagoPasarela = false;

    this.cargarTerminalesActivas();

    // Elegir pestaña inicial según el método de pago de la factura
    const met = metodoPreferido || this.metodosPagoList.find(m => m.id === factura.id_metodo_pago);
    const pas = (met?.pasarela || '').toLowerCase();
    if (pas === 'wompi' || (met?.tipo === 'Pasarela' && this.metodosLinkDisponibles.length > 0)) {
      this.canalCobro = 'link';
      this.idMetodoLinkSeleccionado = met?.id || this.metodosLinkDisponibles[0]?.id || null;
    } else {
      this.canalCobro = 'datafono';
      if (this.terminalesActivas.length > 0 && !this.idTerminalSeleccionada) {
        this.idTerminalSeleccionada = this.terminalesActivas[0].id || null;
      }
    }

    this.mostrarModalPasarela = true;
    this.cdr.detectChanges();

    // Si viene directamente de emitir la factura, iniciar el cobro automáticamente para ahorrar pasos
    if (modo === 'emision') {
      this.iniciarCobroPasarela();
    }
  }

  confirmarPagoManualDirecto(): void {
    if (!this.facturaACobrar || !this.facturaACobrar.id) return;
    this.procesandoPagoPasarela = true;
    this.cdr.detectChanges();

    this.facturasService.pagarFacturaPasarela(this.facturaACobrar.id, {
      pasarela: 'caja',
      referencia_pago: `CAJA-${Date.now()}`,
      id_metodo_pago: this.facturaACobrar.id_metodo_pago || 1
    }).subscribe({
      next: async (res) => {
        this.procesandoPagoPasarela = false;
        this.detenerPollingCobro();
        if (res?.factura) {
          this.actualizarFacturaEnMemoria(res.factura);
        }
        const eraEmision = this.pasarelaModo === 'emision';
        this.mostrarModalPasarela = false;
        this.facturaACobrar = null;
        this.cobroActual = null;
        if (eraEmision) {
          this.modalTitulo = '¡Factura Pagada y Emitida!';
          this.modalMensaje = 'Pago confirmado directamente en caja. La factura quedó en estado Pagada y el inventario fue actualizado.';
          this.mostrarModalConfirmacion = true;
        } else {
          await this.mostrarToastSimple('✅ ¡Factura marcada como Pagada en caja!', 'success');
        }
        this.cdr.detectChanges();
      },
      error: async (err) => {
        this.procesandoPagoPasarela = false;
        const msg = err?.error?.mensaje || 'No se pudo registrar el pago en caja.';
        await this.mostrarToastSimple(msg, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  cerrarModalPasarela(): void {
    this.detenerPollingCobro();
    this.procesandoPagoPasarela = false;
    const eraEmision = this.pasarelaModo === 'emision';
    const cobroFueAprobado = this.cobroActual?.estado === 'APROBADA';
    this.mostrarModalPasarela = false;
    this.facturaACobrar = null;
    this.cobroActual = null;

    if (eraEmision && !cobroFueAprobado) {
      this.modalTitulo = 'Factura Emitida (Pago Pendiente)';
      this.modalMensaje = 'La factura quedó registrada como Emitida. Puedes cobrarla en cualquier momento desde el Historial de Facturas.';
      this.mostrarModalConfirmacion = true;
    }
    this.cdr.detectChanges();
  }

  async iniciarCobroPasarela(): Promise<void> {
    if (!this.facturaACobrar || !this.facturaACobrar.id) return;

    const payload: { canal: 'datafono' | 'link'; id_terminal?: number; id_metodo_pago?: number } = {
      canal: this.canalCobro
    };

    if (this.canalCobro === 'datafono') {
      const termId = this.idTerminalSeleccionada || this.terminalesActivas[0]?.id || 1;
      payload.id_terminal = Number(termId);
    } else {
      const linkId = this.idMetodoLinkSeleccionado || this.metodosLinkDisponibles[0]?.id || this.facturaACobrar.id_metodo_pago || 4;
      payload.id_metodo_pago = Number(linkId);
    }

    this.procesandoPagoPasarela = true;
    this.cdr.detectChanges();

    this.cobrosService.crearCobro(this.facturaACobrar.id, payload).subscribe({
      next: async (res) => {
        this.procesandoPagoPasarela = false;
        this.cobroActual = res.cobro;
        if (res.factura) {
          this.actualizarFacturaEnMemoria(res.factura);
        }

        if (this.cobroActual.url_pago) {
          window.open(this.cobroActual.url_pago, '_blank');
        }

        if (this.cobroActual.estado === 'PENDIENTE') {
          this.iniciarPollingCobro(this.cobroActual.id);
        } else if (this.cobroActual.estado === 'APROBADA') {
          await this.onCobroConfirmadoExitoso(this.cobroActual);
        }
        this.cdr.detectChanges();
      },
      error: async (err) => {
        this.procesandoPagoPasarela = false;
        const msg = err?.error?.mensaje || 'No se pudo iniciar el cobro en la terminal / pasarela.';
        await this.mostrarToastSimple(msg, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  private iniciarPollingCobro(idCobro: number): void {
    this.detenerPollingCobro();
    this.pollingStartedAt = Date.now();
    this.pollingTimer = setInterval(() => {
      // Detener después de 5 minutos máximo
      if (Date.now() - this.pollingStartedAt > 5 * 60 * 1000) {
        this.detenerPollingCobro();
        return;
      }
      this.cobrosService.getCobro(idCobro).subscribe({
        next: async (res) => {
          if (!res?.cobro) return;
          this.cobroActual = res.cobro;
          if (res.factura) {
            this.actualizarFacturaEnMemoria(res.factura);
          }
          if (res.cobro.estado !== 'PENDIENTE') {
            this.detenerPollingCobro();
            if (res.cobro.estado === 'APROBADA') {
              await this.onCobroConfirmadoExitoso(res.cobro);
            }
          }
          this.cdr.detectChanges();
        },
        error: () => {}
      });
    }, 3000);
  }

  private detenerPollingCobro(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  simularResultadoActual(resultado: 'APROBADA' | 'RECHAZADA'): void {
    if (!this.cobroActual) return;
    this.procesandoPagoPasarela = true;
    this.cdr.detectChanges();

    this.cobrosService.simularCobro(this.cobroActual.id, resultado).subscribe({
      next: async (res) => {
        this.procesandoPagoPasarela = false;
        this.detenerPollingCobro();
        this.cobroActual = res.cobro;
        if (res.factura) {
          this.actualizarFacturaEnMemoria(res.factura);
        }
        if (res.cobro.estado === 'APROBADA') {
          await this.onCobroConfirmadoExitoso(res.cobro);
        } else {
          await this.mostrarToastSimple('❌ Pago simulado como RECHAZADO. Puedes reintentar el cobro.', 'warning');
        }
        this.cdr.detectChanges();
      },
      error: async (err) => {
        this.procesandoPagoPasarela = false;
        const msg = err?.error?.mensaje || 'No se pudo simular el resultado del cobro.';
        await this.mostrarToastSimple(msg, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  cancelarCobroPendiente(): void {
    if (!this.cobroActual) return;
    this.procesandoPagoPasarela = true;
    this.cdr.detectChanges();

    this.cobrosService.cancelarCobro(this.cobroActual.id).subscribe({
      next: async (res) => {
        this.procesandoPagoPasarela = false;
        this.detenerPollingCobro();
        this.cobroActual = res.cobro;
        await this.mostrarToastSimple('Cobro pendiente anulado.', 'medium');
        this.cdr.detectChanges();
      },
      error: async (err) => {
        this.procesandoPagoPasarela = false;
        const msg = err?.error?.mensaje || 'No se pudo cancelar el cobro.';
        await this.mostrarToastSimple(msg, 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  reintentarCobro(): void {
    this.detenerPollingCobro();
    this.cobroActual = null;
    this.cdr.detectChanges();
  }

  private async onCobroConfirmadoExitoso(cobro: CobroTransaccion): Promise<void> {
    const ref = cobro.id_externo || cobro.referencia;
    const prov = (cobro.proveedor || '').toUpperCase();
    const eraEmision = this.pasarelaModo === 'emision';

    if (this.facturaSeleccionada?.id) {
      this.cargarCobrosDeFactura(this.facturaSeleccionada.id);
    }

    this.mostrarModalPasarela = false;
    this.facturaACobrar = null;
    this.cobroActual = null;

    if (eraEmision) {
      this.modalTitulo = '¡Factura Pagada y Emitida!';
      this.modalMensaje = `Pago confirmado por ${prov} (Ref: ${ref}). La factura quedó en estado Pagada y el inventario fue actualizado.`;
      this.mostrarModalConfirmacion = true;
    } else {
      await this.mostrarToastSimple(`✅ ¡Pago confirmado! Ref: ${ref}`, 'success');
    }
    this.cdr.detectChanges();
  }

  private actualizarFacturaEnMemoria(factActualizada: Factura): void {
    if (this.facturaSeleccionada && this.facturaSeleccionada.id === factActualizada.id) {
      this.facturaSeleccionada.estado = factActualizada.estado;
      this.facturaSeleccionada.pasarela = factActualizada.pasarela;
      this.facturaSeleccionada.referencia_pago = factActualizada.referencia_pago;
    }
    const item = this.facturas.find(f => f.id === factActualizada.id);
    if (item) {
      item.estado = factActualizada.estado;
      item.pasarela = factActualizada.pasarela;
      item.referencia_pago = factActualizada.referencia_pago;
    }
  }

  // MODAL DETALLE DE FACTURA
  verDetalleFactura(fact: Factura): void {
    this.facturaSeleccionada = fact;
    this.cobrosFacturaSeleccionada = [];
    this.cargandoDetalle = true;
    this.mostrarModalDetalle = true;
    this.cdr.detectChanges();

    if (fact.id) {
      this.cargarCobrosDeFactura(fact.id);
      this.facturasService.getFacturaById(fact.id).pipe(
        finalize(() => {
          this.cargandoDetalle = false;
          this.cdr.detectChanges();
        })
      ).subscribe({
        next: (factCompleta) => {
          this.facturaSeleccionada = factCompleta;
          this.cdr.detectChanges();
        },
        error: () => {
          this.cargandoDetalle = false;
        }
      });
    } else {
      this.cargandoDetalle = false;
    }
  }

  private cargarCobrosDeFactura(idFactura: number): void {
    this.cobrosService.listarCobrosPorFactura(idFactura).subscribe({
      next: (lista) => {
        this.cobrosFacturaSeleccionada = Array.isArray(lista) ? lista : [];
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle = false;
    this.facturaSeleccionada = null;
    this.cobrosFacturaSeleccionada = [];
    this.cdr.detectChanges();
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

    this.idProductoSeleccionado = null;
    this.productoSeleccionadoObj = null;
    this.cantidadSeleccionada = 1;
    this.precioSeleccionado = 0;
    this.itemsFactura = [];
    this.subtotalVenta = 0;
    this.ivaVenta = 0;
    this.totalVenta = 0;

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
