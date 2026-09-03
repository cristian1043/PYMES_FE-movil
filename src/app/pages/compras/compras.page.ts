import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController, ToastController } from '@ionic/angular/lazy';
import { AuthService } from '../../services/auth.service';
import { ComprasService, Compra } from '../../services/compras.service';

@Component({
  selector: 'app-compras',
  templateUrl: './compras.page.html',
  styleUrls: ['./compras.page.scss'],
  standalone: false
})
export class ComprasPage implements OnInit {
  activeTab: 'hub' | 'nueva' | 'listado' = 'hub';

  compras: Compra[] = [];
  loading = false;
  usuario: any = null;
  currentPage = 1;
  totalPages = 1;
  hasMorePages = true;

  // Formulario nueva compra
  proveedorNombre = '';
  totalCompra: number | null = null;
  guardando = false;

  // Modal de confirmación personalizado
  mostrarModalConfirmacion = false;
  modalTitulo = '';
  modalMensaje = '';

  constructor(
    private authService: AuthService,
    private comprasService: ComprasService,
    private router: Router,
    private menuCtrl: MenuController,
    private toastController: ToastController
  ) {}

  ngOnInit(): void {
    this.verificarAutenticacion();
  }

  ionViewWillEnter(): void {
    this.verificarAutenticacion();
  }

  private verificarAutenticacion(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }
    this.usuario = this.authService.getUsuario();
  }

  toggleMenu(): void {
    this.menuCtrl.toggle('main-menu');
  }

  irAIndex(): void {
    this.router.navigateByUrl('/inicio');
  }

  cancelarOVolver(): void {
    if (this.activeTab === 'hub') {
      this.router.navigateByUrl('/inicio');
    } else {
      this.activeTab = 'hub';
    }
  }

  seleccionarAccion(accion: 'nueva' | 'listado'): void {
    this.activeTab = accion;
    if (accion === 'listado') {
      this.cargarCompras(1, true);
    }
  }

  cargarCompras(page: number = 1, isInitial: boolean = false, event?: any): void {
    if (isInitial) {
      this.loading = true;
      this.currentPage = 1;
      this.compras = [];
    }

    this.comprasService.getCompras(page, 15).subscribe({
      next: (res) => {
        this.loading = false;
        if (event) event.target.complete();

        let newItems: Compra[] = [];
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
          this.compras = newItems;
        } else {
          this.compras = [...this.compras, ...newItems];
        }
      },
      error: (err) => {
        this.loading = false;
        if (event) event.target.complete();
        console.error('Error al cargar compras:', err);
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
    this.cargarCompras(this.currentPage, false, event);
  }

  handleRefresh(event: any): void {
    this.cargarCompras(1, true, event);
  }

  async onRegistrarCompra(): Promise<void> {
    if (!this.proveedorNombre || !this.totalCompra || this.totalCompra <= 0) {
      const toast = await this.toastController.create({
        message: 'Por favor ingresa el nombre del proveedor y un monto total válido.',
        duration: 2500,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    this.guardando = true;

    this.comprasService.createCompra({
      proveedor_nombre: this.proveedorNombre.trim(),
      total: Number(this.totalCompra),
      estado: 'Completada'
    }).subscribe({
      next: (res) => {
        this.guardando = false;
        this.limpiarFormulario();
        this.modalTitulo = '¡Compra Registrada!';
        this.modalMensaje = 'La orden de compra ha sido registrada con éxito. ¿Quieres ver el historial de compras?';
        this.mostrarModalConfirmacion = true;
      },
      error: async (err) => {
        this.guardando = false;
        console.error('Error al registrar compra:', err);
        const toast = await this.toastController.create({
          message: err?.error?.mensaje || 'No se pudo registrar la orden de compra.',
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
    });
  }

  responderModal(verListado: boolean): void {
    this.mostrarModalConfirmacion = false;
    this.limpiarFormulario();
    if (verListado) {
      this.seleccionarAccion('listado');
    } else {
      this.activeTab = 'nueva';
    }
  }

  private limpiarFormulario(): void {
    this.proveedorNombre = '';
    this.totalCompra = null;
  }
}
