import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastController } from '@ionic/angular/lazy';
import { AuthService } from '../../services/auth.service';
import { ComprasService, Compra, ItemCompra } from '../../services/compras.service';
import { ProveedoresService, Proveedor } from '../../services/proveedores.service';
import { ProductosService, Producto } from '../../services/productos.service';
import { MenuStateService } from '../../services/menu-state.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-compras',
  templateUrl: './compras.page.html',
  styleUrls: ['./compras.page.scss'],
  standalone: false
})
export class ComprasPage implements OnInit {
  activeTab: 'hub' | 'nueva' | 'listado' = 'hub';

  // Catálogos
  proveedores: any[] = [];
  productos: any[] = [];
  cargandoCatalogos = false;

  // Listado de compras
  compras: Compra[] = [];
  loading = false;
  usuario: any = null;
  currentPage = 1;
  totalPages = 1;
  hasMorePages = true;

  // Formulario nueva orden de compra
  siguienteNumero = 'COMP-001';
  idProveedor: number | null = null;

  // Selección de producto para borrador
  idProductoSeleccionado: number | null = null;
  costoUnitario: number | null = null;
  cantidad: number = 1;

  // Ítems de la orden
  itemsCompra: ItemCompra[] = [];

  // Totales
  subtotalNeto: number = 0;
  iva: number = 0;
  descuento: number = 0;
  totalCompra: number = 0;

  guardando = false;

  // Modal de confirmación personalizado
  mostrarModalConfirmacion = false;
  modalTitulo = '';
  modalMensaje = '';

  constructor(
    private authService: AuthService,
    private comprasService: ComprasService,
    private proveedoresService: ProveedoresService,
    private productosService: ProductosService,
    private router: Router,
    private route: ActivatedRoute,
    private menuStateService: MenuStateService,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.verificarAutenticacion();
    this.sincronizarTabDesdeUrl();
  }

  ionViewWillEnter(): void {
    this.verificarAutenticacion();
    this.sincronizarTabDesdeUrl();
  }

  private sincronizarTabDesdeUrl(): void {
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam === 'listado' || tabParam === 'nueva') {
      this.activeTab = tabParam;
    } else {
      this.activeTab = 'hub';
    }

    if (this.activeTab === 'nueva') {
      this.cargarCatalogos();
    } else if (this.activeTab === 'listado') {
      this.cargarCompras(this.currentPage || 1, true);
    }
    this.cdr.detectChanges();
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
    if (accion === 'nueva') {
      this.cargarCatalogos();
    } else if (accion === 'listado') {
      this.cargarCompras(1, true);
    }
    this.cdr.detectChanges();
  }

  cargarCatalogos(): void {
    this.cargandoCatalogos = true;

    // Obtener siguiente consecutivo
    this.comprasService.getSiguienteNumero().subscribe({
      next: (res) => {
        if (res && res.siguiente_numero) {
          this.siguienteNumero = res.siguiente_numero;
        }
      },
      error: () => {}
    });

    // Cargar proveedores
    this.proveedoresService.getProveedores(1, 100).subscribe({
      next: (res) => {
        if (Array.isArray(res)) {
          this.proveedores = res;
        } else if (res && Array.isArray(res.items)) {
          this.proveedores = res.items;
        }
      },
      error: (err) => console.error('Error cargando proveedores:', err)
    });

    // Cargar productos
    this.productosService.getProductos(1, 100).pipe(
      finalize(() => {
        this.cargandoCatalogos = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (res) => {
        if (Array.isArray(res)) {
          this.productos = res;
        } else if (res && Array.isArray(res.items)) {
          this.productos = res.items;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando productos:', err);
        this.cdr.detectChanges();
      }
    });
  }

  onProductoSeleccionadoChange(): void {
    if (!this.idProductoSeleccionado) {
      this.costoUnitario = null;
      return;
    }
    const prod = this.productos.find(p => p.id == this.idProductoSeleccionado);
    if (prod) {
      const costoVal = prod.costo ? Number(prod.costo) : (Number(prod.precio || 0) * 0.70);
      this.costoUnitario = Math.round(costoVal * 100) / 100;
    }
  }

  async agregarItem(): Promise<void> {
    if (!this.idProductoSeleccionado) {
      const toast = await this.toastController.create({
        message: 'Por favor selecciona un producto del inventario.',
        duration: 2500,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    const prod = this.productos.find(p => p.id == this.idProductoSeleccionado);
    if (!prod) return;

    const costo = Number(this.costoUnitario) || 0;
    const cant = Number(this.cantidad) || 1;

    if (costo <= 0) {
      const toast = await this.toastController.create({
        message: 'Por favor ingresa un costo unitario válido.',
        duration: 2500,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    if (cant <= 0) {
      const toast = await this.toastController.create({
        message: 'La cantidad debe ser al menos 1.',
        duration: 2500,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    const existeIdx = this.itemsCompra.findIndex(i => i.id_producto == prod.id);
    if (existeIdx >= 0) {
      this.itemsCompra[existeIdx].cantidad += cant;
      this.itemsCompra[existeIdx].costo_unitario = costo;
      this.itemsCompra[existeIdx].subtotal = +(this.itemsCompra[existeIdx].cantidad * costo).toFixed(2);
    } else {
      this.itemsCompra.push({
        id_producto: prod.id,
        codigo: prod.codigo || ('PROD-' + prod.id),
        nombre_producto: prod.nombre,
        costo_unitario: costo,
        cantidad: cant,
        subtotal: +(cant * costo).toFixed(2)
      });
    }

    this.idProductoSeleccionado = null;
    this.costoUnitario = null;
    this.cantidad = 1;

    this.calcularTotales();
  }

  eliminarItem(index: number): void {
    this.itemsCompra.splice(index, 1);
    this.calcularTotales();
  }

  calcularTotales(): void {
    this.subtotalNeto = this.itemsCompra.reduce((sum, item) => sum + item.subtotal, 0);
    this.subtotalNeto = +(this.subtotalNeto).toFixed(2);
    this.iva = +(this.subtotalNeto * 0.19).toFixed(2);
    const desc = Number(this.descuento) || 0;
    this.totalCompra = Math.max(0, +(this.subtotalNeto + this.iva - desc).toFixed(2));
  }

  cargarCompras(page: number = 1, isInitial: boolean = false, event?: any): void {
    if (isInitial) {
      this.loading = true;
      this.currentPage = 1;
      this.compras = [];
    }

    this.comprasService.getCompras(page, 15).pipe(
      finalize(() => {
        this.loading = false;
        if (event) event.target.complete();
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (res) => {
        let newItems: Compra[] = [];
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
          this.compras = newItems;
        } else {
          this.compras = [...this.compras, ...newItems];
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar compras:', err);
        this.cdr.detectChanges();
      }
    });
  }

  loadMoreData(event: any): void {
    if (!this.hasMorePages) {
      event.target.disabled = true;
      event.target.complete();
      return;
    }
    this.currentPage++;
    this.cargarCompras(this.currentPage, false, event);
  }

  handleRefresh(event: any): void {
    this.cargarCompras(1, true, event);
  }

  async onRegistrarCompra(): Promise<void> {
    if (!this.idProveedor) {
      const toast = await this.toastController.create({
        message: 'Debes seleccionar un proveedor del catálogo.',
        duration: 2500,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    if (this.itemsCompra.length === 0) {
      const toast = await this.toastController.create({
        message: 'Debes agregar al menos un producto a la orden de compra.',
        duration: 2500,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    if (this.totalCompra <= 0) {
      const toast = await this.toastController.create({
        message: 'El monto total de la compra debe ser mayor a 0.',
        duration: 2500,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    this.guardando = true;

    const payload: Partial<Compra> = {
      numero: this.siguienteNumero,
      id_proveedor: Number(this.idProveedor),
      id_usuario: this.usuario?.id || 1,
      subtotal: this.subtotalNeto,
      iva: this.iva,
      descuento: Number(this.descuento) || 0,
      total: this.totalCompra,
      estado: 'Completada',
      detalles: this.itemsCompra
    };

    this.comprasService.createCompra(payload).pipe(
      finalize(() => {
        this.guardando = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (res) => {
        this.modalTitulo = '✅ ¡Orden de Compra Procesada!';
        this.modalMensaje = `La orden ${res.numero || this.siguienteNumero} fue registrada exitosamente y el inventario de los productos comprados ha sido incrementado.`;
        this.mostrarModalConfirmacion = true;
        this.cdr.detectChanges();
      },
      error: async (err) => {
        console.error('Error al registrar compra:', err);
        const toast = await this.toastController.create({
          message: err?.error?.mensaje || 'No se pudo procesar la orden de compra.',
          duration: 3500,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
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
      this.cargarCatalogos();
    }
    this.cdr.detectChanges();
  }

  private limpiarFormulario(): void {
    this.idProveedor = null;
    this.idProductoSeleccionado = null;
    this.costoUnitario = null;
    this.cantidad = 1;
    this.itemsCompra = [];
    this.descuento = 0;
    this.subtotalNeto = 0;
    this.iva = 0;
    this.totalCompra = 0;
  }
}
