import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ReportesService } from '../../services/reportes.service';
import { MenuStateService } from '../../services/menu-state.service';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.page.html',
  styleUrls: ['./reportes.page.scss'],
  standalone: false
})
export class ReportesPage implements OnInit, OnDestroy {
  activeTab: 'dashboard' | 'ventas' | 'inventario' | 'clientes' = 'dashboard';
  loading = false;
  usuario: any = null;
  rolId: number = 1;

  // Métricas Dashboard
  totalVentas = 0;
  totalProductos = 0;
  stockBajoCount = 0;
  cantidadFacturas = 0;
  valorInventario = 0;
  promedioVenta = 0;
  ivaTotal = 0;

  // Reporte Ventas
  ventasResumen: any = null;
  facturas: any[] = [];
  facturasFiltradas: any[] = [];
  facturasPaginadas: any[] = [];
  searchFacturas = '';
  pageVentas = 1;
  perPageVentas = 10;
  totalPagesVentas = 1;

  // Reporte Inventario
  inventarioResumen: any = null;
  productos: any[] = [];
  productosFiltrados: any[] = [];
  productosPaginados: any[] = [];
  searchProductos = '';
  pageInventario = 1;
  perPageInventario = 10;
  totalPagesInventario = 1;

  // Reporte Clientes
  clientesRanking: any[] = [];
  clientesFiltrados: any[] = [];
  clientesPaginados: any[] = [];
  searchClientes = '';
  pageClientes = 1;
  perPageClientes = 10;
  totalPagesClientes = 1;

  private queryParamsSub?: Subscription;

  constructor(
    private authService: AuthService,
    private reportesService: ReportesService,
    private router: Router,
    private route: ActivatedRoute,
    private menuStateService: MenuStateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.verificarAutenticacion();
    this.queryParamsSub = this.route.queryParamMap.subscribe((params) => {
      const tabParam = params.get('tab');
      let newTab: 'dashboard' | 'ventas' | 'inventario' | 'clientes' =
        (tabParam && ['dashboard', 'ventas', 'inventario', 'clientes'].includes(tabParam))
          ? tabParam as any
          : 'dashboard';

      // El almacenista (rol 3) solo tiene permitido ver inventario
      if (this.rolId === 3) {
        newTab = 'inventario';
      }

      const tabChanged = this.activeTab !== newTab;
      this.activeTab = newTab;

      if (tabChanged || (this.activeTab === 'inventario' && this.productos.length === 0) || this.totalVentas === 0) {
        this.cargarDatosActuales();
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
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    let targetTab: 'dashboard' | 'ventas' | 'inventario' | 'clientes' =
      (tabParam && ['dashboard', 'ventas', 'inventario', 'clientes'].includes(tabParam))
        ? tabParam as any
        : 'dashboard';

    if (this.rolId === 3) {
      targetTab = 'inventario';
    }

    if (this.activeTab !== targetTab || (this.activeTab === 'inventario' && this.productos.length === 0)) {
      this.activeTab = targetTab;
      this.cargarDatosActuales();
    }
  }


  private verificarAutenticacion(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }
    this.usuario = this.authService.getUsuario();
    this.rolId = this.authService.getRolId();

    if (this.rolId === 3 && this.activeTab !== 'inventario') {
      this.activeTab = 'inventario';
    }
    this.cdr.detectChanges();
  }

  toggleMenu(): void {
    this.menuStateService.toggle();
  }

  irAIndex(): void {
    this.router.navigateByUrl('/inicio');
  }

  cancelarOVolver(): void {
    if (this.rolId === 3 || this.activeTab === 'dashboard') {
      this.router.navigateByUrl('/inicio');
    } else {
      this.cambiarTab('dashboard');
    }
  }

  cambiarTab(tab: 'dashboard' | 'ventas' | 'inventario' | 'clientes'): void {
    if (this.rolId === 3 && tab !== 'inventario') {
      return;
    }
    this.activeTab = tab;
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab } });
    this.cargarDatosActuales();
  }

  cargarDatosActuales(event?: any): void {
    this.loading = true;
    this.cdr.detectChanges();

    if (this.activeTab === 'dashboard') {
      this.reportesService.getDashboardMetrics().pipe(
        finalize(() => {
          this.loading = false;
          if (event) event.target.complete();
          this.cdr.detectChanges();
        })
      ).subscribe({
        next: (data: any) => {
          this.totalVentas = data?.total_ventas || 0;
          this.totalProductos = data?.total_productos || 0;
          this.stockBajoCount = data?.stock_bajo || 0;
          this.cantidadFacturas = data?.cantidad_facturas || 0;
          this.valorInventario = data?.valor_inventario || 0;
          this.promedioVenta = data?.promedio_venta || 0;
          this.ivaTotal = data?.iva_total || 0;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Error al cargar dashboard:', err);
          this.cdr.detectChanges();
        }
      });
    } else if (this.activeTab === 'ventas') {
      this.reportesService.getReporteVentas().pipe(
        finalize(() => {
          this.loading = false;
          if (event) event.target.complete();
          this.cdr.detectChanges();
        })
      ).subscribe({
        next: (res: any) => {
          this.ventasResumen = res;
          this.facturas = res?.facturas || [];
          this.filtrarFacturas();
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Error reporte ventas:', err);
          this.cdr.detectChanges();
        }
      });
    } else if (this.activeTab === 'inventario') {
      this.reportesService.getReporteInventario().pipe(
        finalize(() => {
          this.loading = false;
          if (event) event.target.complete();
          this.cdr.detectChanges();
        })
      ).subscribe({
        next: (res: any) => {
          this.inventarioResumen = res;
          this.productos = res?.productos || [];
          this.stockBajoCount = res?.productos_bajo_stock ?? this.productos.filter(p => Number(p.stock || 0) <= 2500).length;
          this.filtrarProductos();
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Error reporte inventario:', err);
          this.cdr.detectChanges();
        }
      });
    } else if (this.activeTab === 'clientes') {
      this.reportesService.getReporteClientes().pipe(
        finalize(() => {
          this.loading = false;
          if (event) event.target.complete();
          this.cdr.detectChanges();
        })
      ).subscribe({
        next: (res: any) => {
          this.clientesRanking = Array.isArray(res) ? res : [];
          this.filtrarClientes();
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Error reporte clientes:', err);
          this.cdr.detectChanges();
        }
      });
    }
  }

  // ==========================================
  // PAGINACIÓN Y FILTROS: VENTAS
  // ==========================================
  filtrarFacturas(): void {
    if (!this.searchFacturas || this.searchFacturas.trim() === '') {
      this.facturasFiltradas = [...this.facturas];
    } else {
      const term = this.searchFacturas.toLowerCase().trim();
      this.facturasFiltradas = this.facturas.filter(f =>
        (f.numero && f.numero.toLowerCase().includes(term)) ||
        (f.fecha && f.fecha.toLowerCase().includes(term)) ||
        (f.estado && f.estado.toLowerCase().includes(term))
      );
    }
    this.pageVentas = 1;
    this.actualizarPaginacionVentas();
  }

  actualizarPaginacionVentas(): void {
    this.totalPagesVentas = Math.max(1, Math.ceil(this.facturasFiltradas.length / this.perPageVentas));
    if (this.pageVentas > this.totalPagesVentas) {
      this.pageVentas = this.totalPagesVentas;
    }
    const start = (this.pageVentas - 1) * this.perPageVentas;
    this.facturasPaginadas = this.facturasFiltradas.slice(start, start + this.perPageVentas);
    this.cdr.detectChanges();
  }

  cambiarPaginaVentas(delta: number): void {
    const target = this.pageVentas + delta;
    if (target >= 1 && target <= this.totalPagesVentas) {
      this.pageVentas = target;
      this.actualizarPaginacionVentas();
    }
  }

  // ==========================================
  // PAGINACIÓN Y FILTROS: INVENTARIO
  // ==========================================
  filtrarProductos(): void {
    if (!this.searchProductos || this.searchProductos.trim() === '') {
      this.productosFiltrados = [...this.productos];
    } else {
      const term = this.searchProductos.toLowerCase().trim();
      this.productosFiltrados = this.productos.filter(p =>
        (p.nombre && p.nombre.toLowerCase().includes(term)) ||
        (p.codigo && p.codigo.toLowerCase().includes(term))
      );
    }
    this.pageInventario = 1;
    this.actualizarPaginacionInventario();
  }

  actualizarPaginacionInventario(): void {
    this.totalPagesInventario = Math.max(1, Math.ceil(this.productosFiltrados.length / this.perPageInventario));
    if (this.pageInventario > this.totalPagesInventario) {
      this.pageInventario = this.totalPagesInventario;
    }
    const start = (this.pageInventario - 1) * this.perPageInventario;
    this.productosPaginados = this.productosFiltrados.slice(start, start + this.perPageInventario);
    this.cdr.detectChanges();
  }

  cambiarPaginaInventario(delta: number): void {
    const target = this.pageInventario + delta;
    if (target >= 1 && target <= this.totalPagesInventario) {
      this.pageInventario = target;
      this.actualizarPaginacionInventario();
    }
  }

  getEstadoStock(stock?: number): { texto: string; cssClass: string } {
    const s = Number(stock || 0);
    if (s <= 2500) {
      return { texto: `⚠️ Stock Bajo: ${s}`, cssClass: 'stock-critical' };
    } else if (s > 10000) {
      return { texto: `📦 Sobre-stock: ${s}`, cssClass: 'stock-over' };
    }
    return { texto: `✅ Óptimo: ${s}`, cssClass: '' };
  }

  // ==========================================
  // PAGINACIÓN Y FILTROS: CLIENTES
  // ==========================================
  filtrarClientes(): void {
    if (!this.searchClientes || this.searchClientes.trim() === '') {
      this.clientesFiltrados = [...this.clientesRanking];
    } else {
      const term = this.searchClientes.toLowerCase().trim();
      this.clientesFiltrados = this.clientesRanking.filter(c =>
        (c.nombre && c.nombre.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.telefono && c.telefono.toLowerCase().includes(term))
      );
    }
    this.pageClientes = 1;
    this.actualizarPaginacionClientes();
  }

  actualizarPaginacionClientes(): void {
    this.totalPagesClientes = Math.max(1, Math.ceil(this.clientesFiltrados.length / this.perPageClientes));
    if (this.pageClientes > this.totalPagesClientes) {
      this.pageClientes = this.totalPagesClientes;
    }
    const start = (this.pageClientes - 1) * this.perPageClientes;
    this.clientesPaginados = this.clientesFiltrados.slice(start, start + this.perPageClientes);
    this.cdr.detectChanges();
  }

  cambiarPaginaClientes(delta: number): void {
    const target = this.pageClientes + delta;
    if (target >= 1 && target <= this.totalPagesClientes) {
      this.pageClientes = target;
      this.actualizarPaginacionClientes();
    }
  }

  handleRefresh(event: any): void {
    this.cargarDatosActuales(event);
  }
}

