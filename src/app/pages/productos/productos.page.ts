import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular/lazy';
import { AuthService } from '../../services/auth.service';
import { ProductosService, Producto } from '../../services/productos.service';

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

  constructor(
    private authService: AuthService,
    private productosService: ProductosService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit(): void {
    this.usuario = this.authService.getUsuario();
  }

  ionViewWillEnter(): void {
    this.usuario = this.authService.getUsuario();
  }

  cancelarOVolver(): void {
    if (this.activeTab === 'hub') {
      this.router.navigateByUrl('/inicio');
    } else {
      this.activeTab = 'hub';
    }
  }

  seleccionarAccion(accion: 'nuevo' | 'listado'): void {
    this.activeTab = accion;
    if (accion === 'listado') {
      this.cargarProductos(1, true);
    }
  }

  cargarProductos(page: number = 1, isInitial: boolean = false, event?: any): void {
    if (isInitial) {
      this.loading = true;
      this.currentPage = 1;
      this.productos = [];
    }

    this.productosService.getProductos(page, 15).subscribe({
      next: (res) => {
        this.loading = false;
        if (event) event.target.complete();

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
      },
      error: (err) => {
        this.loading = false;
        if (event) event.target.complete();
        console.error('Error al cargar productos:', err);
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
    }).subscribe({
      next: async (res) => {
        this.guardando = false;
        this.limpiarFormulario();

        const alert = await this.alertController.create({
          header: '¡Producto Registrado!',
          message: 'El producto ha sido registrado con éxito. ¿Quieres ver el listado de productos?',
          backdropDismiss: false,
          buttons: [
            {
              text: 'No, crear otro',
              role: 'cancel',
              handler: () => {
                this.activeTab = 'nuevo';
              }
            },
            {
              text: 'Sí, ver listado',
              handler: () => {
                this.seleccionarAccion('listado');
              }
            }
          ]
        });
        await alert.present();
      },
      error: async (err) => {
        this.guardando = false;
        console.error('Error al registrar producto:', err);
        const toast = await this.toastController.create({
          message: err?.error?.mensaje || 'No se pudo registrar el producto. Intenta nuevamente.',
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
    });
  }

  private limpiarFormulario(): void {
    this.nuevoNombre = '';
    this.nuevoCodigo = '';
    this.nuevoPrecio = null;
    this.nuevoStock = null;
    this.nuevaDescripcion = '';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
