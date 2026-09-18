import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Platform } from '@ionic/angular';
import { AuthService } from './services/auth.service';
import { MenuStateService } from './services/menu-state.service';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { StatusBar, Style } from '@capacitor/status-bar';

interface MenuItem {
  title: string;
  url: string;
  icon: string;
  roles: number[];
  requiereEmpresa?: boolean;
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
        { title: 'Inicio / Pantalla Principal', url: '/inicio', icon: 'home-outline', roles: [1, 2, 3], requiereEmpresa: true },
        { title: 'Cambiar de Empresa / Espacio', url: '/seleccionar-empresa', icon: 'business-outline', roles: [1, 2, 3], requiereEmpresa: false },
        { title: 'Productos e Inventario', url: '/productos', icon: 'cube-outline', roles: [1, 3], requiereEmpresa: true },
        { title: 'Facturas y Ventas', url: '/facturas', icon: 'document-text-outline', roles: [1, 2], requiereEmpresa: true },
        { title: 'Gestión de Compras', url: '/compras', icon: 'cart-outline', roles: [1, 3], requiereEmpresa: true },
      ]
    },
    {
      titulo: 'Directorio de Relaciones',
      items: [
        { title: 'Clientes', url: '/clientes', icon: 'people-outline', roles: [1, 2], requiereEmpresa: true },
        { title: 'Proveedores', url: '/proveedores', icon: 'bus-outline', roles: [1, 3], requiereEmpresa: true },
      ]
    },
    {
      titulo: 'Analítica y Administración',
      items: [
        { title: 'Reportes y Métricas', url: '/reportes', icon: 'bar-chart-outline', roles: [1, 3], requiereEmpresa: true },
        { title: 'Gestión de Usuarios', url: '/usuarios', icon: 'shield-checkmark-outline', roles: [1], requiereEmpresa: true },
        { title: 'Configuración Empresa', url: '/empresa', icon: 'settings-outline', roles: [1], requiereEmpresa: true },
      ]
    },
    {
      titulo: 'Mi Cuenta y Perfil',
      items: [
        { title: 'Información Personal', url: '/perfil', icon: 'person-outline', roles: [1, 2, 3], requiereEmpresa: false },
      ]
    }
  ];

  constructor(
    public authService: AuthService,
    private router: Router,
    private location: Location,
    private platform: Platform,
    private menuStateService: MenuStateService
  ) {}

  ngOnInit(): void {
    if (this.platform.is('capacitor')) {
      CapacitorUpdater.notifyAppReady().catch(err => {
        console.warn('CapacitorUpdater notifyAppReady error:', err);
      });

      // Configurar Status Bar para que la app empiece DEBAJO de la cámara/notch
      StatusBar.setOverlaysWebView({ overlay: false }).then(() => {
        return StatusBar.setStyle({ style: Style.Dark });
      }).then(() => {
        return StatusBar.setBackgroundColor({ color: '#0f2b5c' });
      }).catch(err => {
        console.warn('StatusBar config error:', err);
      });
    }

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

    // Manejo global y controlado del botón físico / atrás nativo de Android (Triangulito)
    this.platform.backButton.subscribeWithPriority(10, () => {
      if (this.isMenuOpen) {
        this.closeMenu();
        return;
      }
      const url = this.router.url;
      if (!url || url === '/' || url.includes('/login') || url.includes('/register')) {
        return;
      }
      if (url.includes('/inicio')) {
        // En pantalla de inicio, no hacer nada para evitar salir de sesión
        return;
      }
      if (url.includes('/seleccionar-empresa')) {
        if (this.authService.getEmpresaActiva()) {
          this.closeMenu();
          this.router.navigateByUrl('/inicio');
          return;
        }
        return;
      }
      // Desde cualquier otro módulo (productos, facturas, clientes, etc.), volver de manera segura y limpia a Inicio
      this.closeMenu();
      this.router.navigateByUrl('/inicio');
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
    this.empresaActiva = this.authService.getEmpresaActiva();
    const tieneEmpresa = !!this.empresaActiva;

    this.menuCategoriasPermitidas = this.menuCategoriasRaw
      .map(cat => ({
        titulo: cat.titulo,
        items: cat.items.filter(item => {
          // Si el módulo requiere empresa activa y el usuario no tiene ninguna seleccionada, ocultar
          if (item.requiereEmpresa && !tieneEmpresa) {
            return false;
          }
          // Si no requiere empresa, mostrar siempre para usuarios autenticados
          if (!item.requiereEmpresa) {
            return true;
          }
          // Si requiere empresa, validar rol en dicha empresa activa
          return this.authService.hasRole(item.roles);
        })
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
