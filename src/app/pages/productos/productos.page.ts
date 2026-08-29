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
  loading = true;
  usuario: any = null;

  constructor(
    private authService: AuthService,
    private productosService: ProductosService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.usuario = this.authService.getUsuario();
    this.cargarProductos();
  }

  cargarProductos(event?: any): void {
    this.loading = !event;
    this.productosService.getProductos().subscribe({
      next: (res) => {
        this.loading = false;
        if (event) event.target.complete();

        if (Array.isArray(res)) {
          this.productos = res;
        } else if (res && res.items && Array.isArray(res.items)) {
          this.productos = res.items;
        } else if (res && res.data && Array.isArray(res.data)) {
          this.productos = res.data;
        } else {
          this.productos = [];
        }
      },
      error: (err) => {
        this.loading = false;
        if (event) event.target.complete();
        console.error('Error al cargar productos:', err);
      }
    });
  }

  handleRefresh(event: any): void {
    this.cargarProductos(event);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
