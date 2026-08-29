import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

interface MenuItem {
  title: string;
  url: string;
  icon: string;
  roles: number[];
}

interface MenuCategory {
  titulo: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  usuario: any = null;

  private readonly menuCategoriasRaw: MenuCategory[] = [
    {
      titulo: 'Gestión Principal',
      items: [
        { title: 'Productos e Inventario', url: '/productos', icon: 'cube-outline', roles: [1, 2, 3] },
        { title: 'Facturas y Ventas', url: '/facturas', icon: 'document-text-outline', roles: [1, 2] },
        { title: 'Gestión de Compras', url: '/compras', icon: 'cart-outline', roles: [1, 3] },
      ]
    },
    {
      titulo: 'Directorio de Relaciones',
      items: [
        { title: 'Clientes', url: '/clientes', icon: 'people-outline', roles: [1, 2] },
        { title: 'Proveedores', url: '/proveedores', icon: 'bus-outline', roles: [1, 3] },
      ]
    },
    {
      titulo: 'Analítica y Administración',
      items: [
        { title: 'Reportes y Métricas', url: '/reportes', icon: 'bar-chart-outline', roles: [1, 3] },
        { title: 'Gestión de Usuarios', url: '/usuarios', icon: 'shield-checkmark-outline', roles: [1] },
      ]
    }
  ];

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.usuario = user;
    });
  }

  get menuCategoriasPermitidas(): MenuCategory[] {
    if (!this.usuario) return [];
    return this.menuCategoriasRaw
      .map(cat => ({
        titulo: cat.titulo,
        items: cat.items.filter(item => this.authService.hasRole(item.roles))
      }))
      .filter(cat => cat.items.length > 0);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
