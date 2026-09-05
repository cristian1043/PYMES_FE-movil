import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastController } from '@ionic/angular/lazy';
import { AuthService } from '../../services/auth.service';
import { ProductosService, Producto } from '../../services/productos.service';
import { MenuStateService } from '../../services/menu-state.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-productos',
  templateUrl: './productos.page.html',
  styleUrls: ['./productos.page.scss'],
  standalone: false
})
export class ProductosPage implements OnInit {
  activeTab: 'hub' | 'nuevo' | 'listado' = 'hub';

  // Datos para el listado
  productos: Producto[] = [];
  productosFiltrados: Producto[] = [];
  searchTerm = '';
  loading = false;
  usuario: any = null;
  currentPage = 1;
  totalPages = 1;
  hasMorePages = true;

  // Formulario nuevo producto
  nuevoNombre = '';
  nuevoCodigo = '';
  nuevoPrecio: number | null = null;
  nuevoStock: number | null = null;
  nuevaDescripcion = '';
  guardando = false;

  // Modal de confirmación personalizado
  mostrarModalConfirmacion = false;
  modalTitulo = '';
  modalMensaje = '';

  constructor(
    private authService: AuthService,
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
    if (tabParam === 'listado' || tabParam === 'nuevo') {
      this.activeTab = tabParam;
    } else {
      this.activeTab = 'hub';
    }

    if (this.activeTab === 'listado') {
      this.cargarProductos(this.currentPage || 1, true);
    } else if (this.activeTab === 'nuevo') {
      this.cargarSiguienteCodigo();
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
      this.currentPage = 1;
      this.productos = [];
      this.cdr.detectChanges();
    }

    this.productosService.getProductos(page, 15).pipe(
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

    this.productosService.createProducto({
      nombre: this.nuevoNombre.trim(),
      codigo: (this.nuevoCodigo || '').trim(),
      precio: Number(this.nuevoPrecio),
      stock: Number(this.nuevoStock || 0),
      descripcion: (this.nuevaDescripcion || '').trim()
    }).pipe(
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
    this.nuevoStock = null;
    this.nuevaDescripcion = '';
    this.cargarSiguienteCodigo();
  }
}
