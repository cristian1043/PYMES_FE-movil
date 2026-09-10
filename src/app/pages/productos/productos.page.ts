import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastController } from '@ionic/angular/lazy';
import { AuthService } from '../../services/auth.service';
import { ProductosService, Producto } from '../../services/productos.service';
import { ProveedoresService, Proveedor } from '../../services/proveedores.service';
import { MenuStateService } from '../../services/menu-state.service';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-productos',
  templateUrl: './productos.page.html',
  styleUrls: ['./productos.page.scss'],
  standalone: false
})
export class ProductosPage implements OnInit, OnDestroy {
  activeTab: 'hub' | 'nuevo' | 'listado' = 'hub';

  // Datos para el listado
  productos: Producto[] = [];
  productosFiltrados: Producto[] = [];
  searchTerm = '';
  loading = false;
  usuario: any = null;
  esAdmin = false;
  currentPage = 1;
  totalPages = 1;
  hasMorePages = true;

  // Catálogos reales del sistema
  categorias: any[] = [];
  proveedores: any[] = [];

  // Formulario nuevo producto
  nuevoNombre = '';
  nuevoCodigo = '';
  nuevoPrecio: number | null = null;
  nuevoCosto: number | null = null;
  nuevoStock: number | null = null;
  nuevaDescripcion = '';
  nuevoIdCategoria: number = 1;
  nuevoIdProveedor: number | null = null;
  nuevaUnidadMedida = 'UND';
  guardando = false;

  // Modal detalle de producto al tocar un ítem
  productoSeleccionado: Producto | null = null;
  mostrarModalDetalle = false;

  // Modal confirmación eliminar producto (solo administradores)
  mostrarModalEliminar = false;
  eliminando = false;

  // Modal de confirmación tras crear producto
  mostrarModalConfirmacion = false;
  modalTitulo = '';
  modalMensaje = '';

  private queryParamsSub?: Subscription;

  constructor(
    private authService: AuthService,
    private productosService: ProductosService,
    private proveedoresService: ProveedoresService,
    private router: Router,
    private route: ActivatedRoute,
    private menuStateService: MenuStateService,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.verificarAutenticacion();
    this.cargarCatalogos();
    this.queryParamsSub = this.route.queryParamMap.subscribe((params) => {
      const tabParam = params.get('tab');
      const newTab = (tabParam === 'listado' || tabParam === 'nuevo') ? tabParam : 'hub';
      const tabChanged = this.activeTab !== newTab;
      this.activeTab = newTab;

      if (this.activeTab === 'listado') {
        if (tabChanged || this.productos.length === 0) {
          this.cargarProductos(1, true);
        }
      } else if (this.activeTab === 'nuevo') {
        this.cargarSiguienteCodigo();
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
    this.cargarCatalogos();
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    const targetTab = (tabParam === 'listado' || tabParam === 'nuevo') ? tabParam : 'hub';
    if (this.activeTab !== targetTab) {
      this.activeTab = targetTab;
      if (this.activeTab === 'listado') {
        this.cargarProductos(1, true);
      } else if (this.activeTab === 'nuevo') {
        this.cargarSiguienteCodigo();
      }
      this.cdr.detectChanges();
    } else if (this.activeTab === 'listado' && this.productos.length === 0 && !this.loading) {
      this.cargarProductos(1, true);
    }
  }

  private verificarAutenticacion(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }
    this.usuario = this.authService.getUsuario();
    this.esAdmin = this.authService.hasRole([1]) ||
      (this.usuario?.rol === 'Administrador') ||
      (Number(this.usuario?.id_rol) === 1);
    this.cdr.detectChanges();
  }

  cargarCatalogos(): void {
    this.productosService.getCategorias().subscribe({
      next: (res) => {
        if (Array.isArray(res)) {
          this.categorias = res;
          if (this.categorias.length > 0 && (!this.nuevoIdCategoria || this.nuevoIdCategoria === 1)) {
            this.nuevoIdCategoria = this.categorias[0].id;
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error cargando categorías de productos:', err)
    });

    this.proveedoresService.getProveedores(1, 100).subscribe({
      next: (res) => {
        if (Array.isArray(res)) {
          this.proveedores = res;
        } else if (res && Array.isArray(res.items)) {
          this.proveedores = res.items;
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error cargando proveedores para productos:', err)
    });
  }

  getNombreCategoria(idCat?: number): string {
    if (!idCat) return 'Sin categoría';
    const c = this.categorias.find(cat => Number(cat.id) === Number(idCat));
    return c ? c.nombre : `Categoría #${idCat}`;
  }

  getNombreProveedor(idProv?: number): string {
    if (!idProv) return 'Sin proveedor distribuidor';
    const p = this.proveedores.find(prov => Number(prov.id) === Number(idProv));
    return p ? (p.nombre + (p.nit_documento ? ` (NIT: ${p.nit_documento})` : '')) : `Proveedor #${idProv}`;
  }

  getEstadoStock(stock?: number): { texto: string; color: string; badge: string } {
    const s = Number(stock || 0);
    if (s <= 2500) {
      return { texto: `⚠️ Stock Bajo: ${s} unds`, color: 'warning', badge: 'stock-bajo' };
    } else if (s > 10000) {
      return { texto: `📦 Sobre-stock: ${s} unds`, color: 'tertiary', badge: 'stock-sobre' };
    }
    return { texto: `✅ Óptimo: ${s} unds`, color: 'success', badge: 'stock-optimo' };
  }

  verDetalleProducto(prod: Producto): void {
    this.productoSeleccionado = prod;
    this.mostrarModalDetalle = true;
    this.cdr.detectChanges();
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle = false;
    this.productoSeleccionado = null;
    this.cdr.detectChanges();
  }

  solicitarEliminarProducto(prod: Producto, event?: Event): void {
    if (event) event.stopPropagation();
    if (!this.esAdmin) {
      return;
    }
    this.productoSeleccionado = prod;
    this.mostrarModalEliminar = true;
    this.cdr.detectChanges();
  }

  cancelarEliminar(): void {
    this.mostrarModalEliminar = false;
    this.cdr.detectChanges();
  }

  confirmarEliminarProducto(): void {
    if (!this.productoSeleccionado || !this.productoSeleccionado.id) return;
    this.eliminando = true;
    const id = this.productoSeleccionado.id;

    this.productosService.deleteProducto(id).pipe(
      finalize(() => {
        this.eliminando = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: async () => {
        this.mostrarModalEliminar = false;
        this.mostrarModalDetalle = false;
        this.productoSeleccionado = null;
        this.cargarProductos(this.currentPage, true);
        const toast = await this.toastController.create({
          message: 'Producto eliminado correctamente',
          duration: 3000,
          color: 'success',
          position: 'top'
        });
        await toast.present();
        this.cdr.detectChanges();
      },
      error: async (err) => {
        console.error('Error al eliminar producto:', err);
        const msg = err?.error?.mensaje || 'No se puede eliminar el producto porque está asociado a compras o facturas.';
        const toast = await this.toastController.create({
          message: msg,
          duration: 4000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
        this.cdr.detectChanges();
      }
    });
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

  seleccionarAccion(accion: 'nuevo' | 'listado'): void {
    this.activeTab = accion;
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab: accion } });
    if (accion === 'listado') {
      this.cargarProductos(1, true);
    } else if (accion === 'nuevo') {
      this.cargarSiguienteCodigo();
    }
    this.cdr.detectChanges();
  }

  cargarSiguienteCodigo(): void {
    this.productosService.getSiguienteCodigo().subscribe({
      next: (res) => {
        if (res && res.siguiente_codigo) {
          this.nuevoCodigo = res.siguiente_codigo;
        }
      },
      error: (err) => {
        console.error('Error al obtener siguiente código de producto:', err);
      }
    });
  }

  cargarProductos(page: number = 1, isInitial: boolean = false, event?: any): void {
    if (isInitial) {
      this.loading = true;
      this.currentPage = page;
      this.productos = [];
      this.cdr.detectChanges();
    }

    this.productosService.getProductos(page, 10).pipe(
      finalize(() => {
        this.loading = false;
        if (event) event.target.complete();
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (res) => {
        let newItems: Producto[] = [];
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
          this.productos = newItems;
        } else {
          this.productos = [...this.productos, ...newItems];
        }
        this.filtrarProductos();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar productos:', err);
        this.cdr.detectChanges();
      }
    });
  }

  cambiarPagina(delta: number): void {
    const targetPage = this.currentPage + delta;
    if (targetPage >= 1 && targetPage <= this.totalPages) {
      this.cargarProductos(targetPage, true);
    }
  }


  loadMoreData(event: any): void {
    if (!this.hasMorePages) {
      event.target.disabled = true;
      event.target.complete();
      return;
    }
    this.currentPage++;
    this.cargarProductos(this.currentPage, false, event);
  }

  filtrarProductos(): void {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.productosFiltrados = [...this.productos];
    } else {
      const query = this.searchTerm.toLowerCase();
      this.productosFiltrados = this.productos.filter(p =>
        (p.nombre && p.nombre.toLowerCase().includes(query)) ||
        (p.codigo && p.codigo.toLowerCase().includes(query)) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(query))
      );
    }
  }

  handleRefresh(event: any): void {
    this.cargarProductos(1, true, event);
  }

  async onRegistrarProducto(): Promise<void> {
    if (!this.nuevoNombre || !this.nuevoPrecio || this.nuevoPrecio <= 0) {
      const toast = await this.toastController.create({
        message: 'Por favor ingresa un nombre y precio válidos.',
        duration: 2500,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    this.guardando = true;

    const productoPayload: Producto = {
      nombre: this.nuevoNombre.trim(),
      codigo: (this.nuevoCodigo || '').trim(),
      precio: Number(this.nuevoPrecio),
      costo: this.nuevoCosto !== null ? Number(this.nuevoCosto) : Math.round(Number(this.nuevoPrecio) * 0.70 * 100) / 100,
      stock: Number(this.nuevoStock || 0),
      descripcion: (this.nuevaDescripcion || '').trim(),
      id_categoria: Number(this.nuevoIdCategoria || 1),
      id_proveedor: this.nuevoIdProveedor ? Number(this.nuevoIdProveedor) : undefined,
      unidad_medida: this.nuevaUnidadMedida || 'UND'
    };

    this.productosService.createProducto(productoPayload).pipe(
      finalize(() => {
        this.guardando = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (res) => {
        this.limpiarFormulario();
        this.modalTitulo = '¡Producto Registrado!';
        this.modalMensaje = 'El producto ha sido registrado con éxito. ¿Quieres ver el listado de productos?';
        this.mostrarModalConfirmacion = true;
        this.cdr.detectChanges();
      },
      error: async (err) => {
        console.error('Error al registrar producto:', err);
        const toast = await this.toastController.create({
          message: err?.error?.mensaje || 'No se pudo registrar el producto. Intenta nuevamente.',
          duration: 3000,
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
      this.activeTab = 'nuevo';
      this.cargarSiguienteCodigo();
    }
    this.cdr.detectChanges();
  }

  private limpiarFormulario(): void {
    this.nuevoNombre = '';
    this.nuevoCodigo = '';
    this.nuevoPrecio = null;
    this.nuevoCosto = null;
    this.nuevoStock = null;
    this.nuevaDescripcion = '';
    this.nuevoIdCategoria = this.categorias.length > 0 ? this.categorias[0].id : 1;
    this.nuevoIdProveedor = null;
    this.nuevaUnidadMedida = 'UND';
    this.cargarSiguienteCodigo();
  }
}
