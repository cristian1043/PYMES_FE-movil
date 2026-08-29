import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ProductosService, Producto } from '../../services/productos.service';

@Component({
  selector: 'app-productos',
  templateUrl: './productos.page.html',
  styleUrls: ['./productos.page.scss'],
  standalone: false
})
export class ProductosPage implements OnInit {
  productos: Producto[] = [];
  productosFiltrados: Producto[] = [];
  searchTerm = '';
  loading = true;
  usuario: any = null;
  currentPage = 1;
  totalPages = 1;
  hasMorePages = true;

  constructor(
    private authService: AuthService,
    private productosService: ProductosService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.usuario = this.authService.getUsuario();
    this.cargarProductos(1, true);
  }

  ionViewWillEnter(): void {
    this.usuario = this.authService.getUsuario();
    this.cargarProductos(1, true);
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

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
