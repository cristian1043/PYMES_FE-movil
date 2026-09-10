import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { MenuStateService } from './services/menu-state.service';

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
  empresaActiva: any = null;
  menuCategoriasPermitidas: MenuCategory[] = [];
  isMenuOpen = false;

  private readonly menuCategoriasRaw: MenuCategory[] = [
    {
      titulo: 'Gestión Principal',
      items: [
        { title: 'Inicio / Pantalla Principal', url: '/inicio', icon: 'home-outline', roles: [1, 2, 3] },
        { title: 'Cambiar de Empresa / Espacio', url: '/seleccionar-empresa', icon: 'business-outline', roles: [1, 2, 3] },
        { title: 'Productos e Inventario', url: '/productos', icon: 'cube-outline', roles: [1, 3] },
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
        { title: 'Configuración Empresa', url: '/empresa', icon: 'settings-outline', roles: [1] },
      ]
    },
    {
      titulo: 'Mi Cuenta y Perfil',
      items: [
        { title: 'Información Personal', url: '/perfil', icon: 'person-outline', roles: [1, 2, 3] },
      ]
    }
  ];

  constructor(
    public authService: AuthService,
    private router: Router,
    private menuStateService: MenuStateService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.usuario = user || this.authService.getUsuario();
      this.actualizarMenu();
    });

    this.authService.empresaActiva$.subscribe(emp => {
      this.empresaActiva = emp || this.authService.getEmpresaActiva();
      this.actualizarMenu();
    });

    this.menuStateService.isOpen$.subscribe(isOpen => {
      this.isMenuOpen = isOpen;
    });
  }

  get isAuthPage(): boolean {
    const url = this.router.url;
    return !url || url.includes('/login') || url.includes('/register') || url === '/';
  }

  actualizarMenu(): void {
    const activeUser = this.usuario || this.authService.getUsuario();
    if (!activeUser && !this.authService.isLoggedIn()) {
      this.menuCategoriasPermitidas = [];
      return;
    }
    this.usuario = activeUser;
    this.menuCategoriasPermitidas = this.menuCategoriasRaw
      .map(cat => ({
        titulo: cat.titulo,
        items: cat.items.filter(item => this.authService.hasRole(item.roles))
      }))
      .filter(cat => cat.items.length > 0);
  }

  closeMenu(): void {
    this.menuStateService.close();
  }

  navegar(url: string): void {
    this.closeMenu();
    this.router.navigateByUrl(url);
  }

  logout(): void {
    this.closeMenu();
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}
