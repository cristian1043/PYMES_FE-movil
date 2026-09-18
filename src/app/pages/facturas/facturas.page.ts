import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastController } from '@ionic/angular/lazy';
import { AuthService } from '../../services/auth.service';
import { FacturasService, Factura } from '../../services/facturas.service';
import { ClientesService, Cliente } from '../../services/clientes.service';
import { MetodosPagoService, MetodoPago } from '../../services/metodos-pago.service';
import { ProductosService, Producto } from '../../services/productos.service';
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
  metodosPagoList: MetodoPago[] = [];
  guardando = false;

  // Modal detalle de factura
  facturaSeleccionada: Factura | null = null;
  cargandoDetalle = false;
  mostrarModalDetalle = false;

  // Modal de confirmación personalizado tras crear
  mostrarModalConfirmacion = false;
  modalTitulo = '';
  modalMensaje = '';

  // PASARELA DE PAGOS (WOMPI, MERCADOPAGO, PSE, TARJETAS)
  mostrarModalPasarela = false;
  procesandoPagoPasarela = false;
  pasarelaModo: 'emision' | 'cobro_existente' = 'emision';
  facturaACobrar: Factura | null = null;
  montoAPagarPasarela: number = 0;
  tabPasarela: 'tarjeta' | 'pse' = 'tarjeta';
  pasarelaProveedor: string = 'wompi';

  // Datos Tarjeta
  numeroTarjeta: string = '';
  expiracionTarjeta: string = '';
  cvvTarjeta: string = '';
  titularTarjeta: string = '';
  cuotasTarjeta: number = 1;

  // Datos PSE
  bancoPse: string = 'Bancolombia';
  tipoPersonaPse: string = 'Natural';
  telefonoPse: string = '';
  emailPse: string = '';

  private queryParamsSub?: Subscription;

  constructor(
    private authService: AuthService,
    private facturasService: FacturasService,
    private clientesService: ClientesService,
    private metodosPagoService: MetodosPagoService,
    private productosService: ProductosService,
    private router: Router,
    private route: ActivatedRoute,
    private menuStateService: MenuStateService,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.verificarAutenticacion();
    this.cargarMetodosPago();
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
    if (this.queryParamsSub) {
      this.queryParamsSub.unsubscribe();
    }
  }

  ionViewWillEnter(): void {
    this.verificarAutenticacion();
    this.cargarMetodosPago();
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
    this.empresaActiva = this.authService.getEmpresaActiva();
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
    if (!this.clienteNombre.trim()) {
      await this.mostrarToastSimple('Por favor ingresa o busca los datos del cliente.', 'warning');
      return;
    }

    if (this.itemsFactura.length === 0) {
      await this.mostrarToastSimple('Debes agregar al menos un producto a la factura.', 'warning');
      return;
    }

    const metodo = this.metodosPagoList.find(m => m.id === this.metodoPagoSeleccionadoId);
    const esPasarela = metodo && (metodo.tipo === 'Pasarela' || (metodo.pasarela && metodo.pasarela !== 'ninguna') || metodo.tipo === 'Tarjeta');

    if (esPasarela) {
      // Abrir checkout de Pasarela de Pagos
      this.pasarelaModo = 'emision';
      this.montoAPagarPasarela = this.totalVenta;
      this.mostrarModalPasarela = true;
      this.cdr.detectChanges();
      return;
    }

    // Emisión directa para Efectivo / Transferencia
    this.guardarFacturaEnBackend('Emitida');
  }

  private guardarFacturaEnBackend(estado: string, pasarela?: string, referencia?: string): void {
    this.guardando = true;
    this.cdr.detectChanges();

    const emp = this.authService.getEmpresaActiva();
    const payload: any = {
      cliente_nombre: this.clienteNombre.trim(),
      documento_cliente: (this.documentoCliente || '').trim(),
      tipo_documento: this.tipoDocumento || 'CC',
      cliente_id: this.clienteId || undefined,
      id_cliente: this.clienteId || undefined,
      id_empresa: emp?.id,
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
      next: () => {
        this.guardando = false;
        this.limpiarFormulario();
        this.modalTitulo = estado === 'Pagada' ? '¡Factura Pagada y Emitida!' : '¡Factura Emitida!';
        this.modalMensaje = estado === 'Pagada'
          ? `Factura liquidada exitosamente mediante pasarela (${pasarela?.toUpperCase() || 'Digital'}). Referencia: ${referencia}. El inventario ha sido actualizado en tiempo real.`
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

  // PASARELA DE PAGOS CHECKOUT
  abrirPasarelaCobro(factura: Factura): void {
    this.facturaACobrar = factura;
    this.pasarelaModo = 'cobro_existente';
    this.montoAPagarPasarela = factura.total;
    this.mostrarModalPasarela = true;
    this.cdr.detectChanges();
  }

  cerrarModalPasarela(): void {
    if (this.procesandoPagoPasarela) return;
    this.mostrarModalPasarela = false;
    this.facturaACobrar = null;
    this.cdr.detectChanges();
  }

  async procesarPagoPasarela(): Promise<void> {
    if (this.tabPasarela === 'tarjeta') {
      const numClean = this.numeroTarjeta.replace(/\s+/g, '');
      if (numClean.length < 13) {
        await this.mostrarToastSimple('Ingresa un número de tarjeta de crédito/débito válido.', 'warning');
        return;
      }
      if (!this.expiracionTarjeta.trim() || !this.cvvTarjeta.trim() || !this.titularTarjeta.trim()) {
        await this.mostrarToastSimple('Completa los datos de vencimiento, CVV y titular de la tarjeta.', 'warning');
        return;
      }
    } else {
      if (!this.telefonoPse.trim()) {
        await this.mostrarToastSimple('Ingresa el número celular asociado a tu cuenta bancaria / PSE.', 'warning');
        return;
      }
    }

    this.procesandoPagoPasarela = true;
    this.cdr.detectChanges();

    // Simulación en tiempo real de pasarela de pagos segura (Wompi / MercadoPago)
    setTimeout(() => {
      const refGenerada = `WOMPI-TXN-${Date.now().toString().slice(-7)}`;
      this.procesandoPagoPasarela = false;
      this.mostrarModalPasarela = false;

      if (this.pasarelaModo === 'emision') {
        this.guardarFacturaEnBackend('Pagada', this.pasarelaProveedor, refGenerada);
      } else if (this.pasarelaModo === 'cobro_existente' && this.facturaACobrar && this.facturaACobrar.id) {
        const idFact = this.facturaACobrar.id;
        this.facturasService.pagarFacturaPasarela(idFact, {
          pasarela: this.pasarelaProveedor,
          referencia_pago: refGenerada,
          id_metodo_pago: this.metodoPagoSeleccionadoId
        }).subscribe({
          next: async () => {
            if (this.facturaSeleccionada && this.facturaSeleccionada.id === idFact) {
              this.facturaSeleccionada.estado = 'Pagada';
              this.facturaSeleccionada.pasarela = this.pasarelaProveedor;
              this.facturaSeleccionada.referencia_pago = refGenerada;
            }
            const fItem = this.facturas.find(f => f.id === idFact);
            if (fItem) {
              fItem.estado = 'Pagada';
              fItem.pasarela = this.pasarelaProveedor;
              fItem.referencia_pago = refGenerada;
            }
            await this.mostrarToastSimple(`✅ ¡Pago procesado con éxito! Ref: ${refGenerada}`, 'success');
            this.cdr.detectChanges();
          },
          error: async (err) => {
            console.error('Error al registrar pago en backend:', err);
            await this.mostrarToastSimple('Error al actualizar factura tras pago.', 'danger');
          }
        });
      }
      this.cdr.detectChanges();
    }, 1500);
  }

  // MODAL DETALLE DE FACTURA
  verDetalleFactura(fact: Factura): void {
    this.facturaSeleccionada = fact;
    this.cargandoDetalle = true;
    this.mostrarModalDetalle = true;
    this.cdr.detectChanges();

    if (fact.id) {
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

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle = false;
    this.facturaSeleccionada = null;
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

    // Resetear formulario pasarela
    this.numeroTarjeta = '';
    this.expiracionTarjeta = '';
    this.cvvTarjeta = '';
    this.titularTarjeta = '';
    this.telefonoPse = '';

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
