import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

interface ModuleCard {
  titulo: string;
  descripcion: string;
  url: string;
  icon: string;
  color: string;
  roles: number[];
}

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.page.html',
  styleUrls: ['./inicio.page.scss'],
  standalone: false
})
export class InicioPage implements OnInit {
  usuario: any = null;
  empresaActiva: any = null;
  modulosPermitidos: ModuleCard[] = [];

  private readonly todosModulos: ModuleCard[] = [
    {
      titulo: 'Productos e Inventario',
      descripcion: 'Gestión del catálogo, stock y precios de productos',
      url: '/productos',
      icon: 'cube-outline',
      color: 'primary',
      roles: [1, 3]
    },
    {
      titulo: 'Facturas y Ventas',
      descripcion: 'Emisión de facturas, clientes y registro de ventas',
      url: '/facturas',
      icon: 'document-text-outline',
      color: 'success',
      roles: [1, 2]
    },
    {
      titulo: 'Gestión de Compras',
      descripcion: 'Órdenes de compra y abastecimiento de inventario',
      url: '/compras',
      icon: 'cart-outline',
      color: 'warning',
      roles: [1, 3]
    },
    {
      titulo: 'Directorio de Clientes',
      descripcion: 'Registro y contactos de clientes de la empresa',
      url: '/clientes',
      icon: 'people-outline',
      color: 'tertiary',
      roles: [1, 2]
    },
    {
      titulo: 'Directorio de Proveedores',
      descripcion: 'Registro de proveedores y alianzas de suministro',
      url: '/proveedores',
      icon: 'bus-outline',
      color: 'medium',
      roles: [1, 3]
    },
    {
      titulo: 'Reportes y Métricas',
      descripcion: 'Dashboard ejecutivo de ventas e inventario',
      url: '/reportes',
      icon: 'bar-chart-outline',
      color: 'danger',
      roles: [1, 3]
    },
    {
      titulo: 'Gestión de Usuarios',
      descripcion: 'Administración de usuarios y permisos del sistema',
      url: '/usuarios',
      icon: 'shield-checkmark-outline',
      color: 'dark',
      roles: [1]
    },
    {
      titulo: 'Configuración de Empresa',
      descripcion: 'Datos fiscales y control del estado operativo',
      url: '/empresa',
      icon: 'business-outline',
      color: 'primary',
      roles: [1]
    },
    {
      titulo: 'Información Personal',
      descripcion: 'Consulta y actualiza tus datos de contacto y perfil',
      url: '/perfil',
      icon: 'person-circle-outline',
      color: 'tertiary',
      roles: [1, 2, 3]
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private menuCtrl: MenuController
  ) {}

  ngOnInit(): void {
    this.cargarUsuarioYModulos();
  }

  ionViewWillEnter(): void {
    this.cargarUsuarioYModulos();
  }

  private cargarUsuarioYModulos(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }

    this.empresaActiva = this.authService.getEmpresaActiva();
    if (!this.empresaActiva) {
      this.router.navigate(['/seleccionar-empresa'], { replaceUrl: true });
      return;
    }

    this.usuario = this.authService.getUsuario();
    this.modulosPermitidos = this.todosModulos.filter(mod => this.authService.hasRole(mod.roles));
  }

  cambiarEmpresa(): void {
    this.router.navigateByUrl('/seleccionar-empresa');
  }

  async toggleMenu(): Promise<void> {
    await this.menuCtrl.enable(true, 'main-menu');
    await this.menuCtrl.open('main-menu');
  }

  irAModulo(url: string): void {
    this.router.navigateByUrl(url);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}
