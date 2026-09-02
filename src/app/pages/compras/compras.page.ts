import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular/lazy';
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

  constructor(
    private authService: AuthService,
    private comprasService: ComprasService,
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
      next: async (res) => {
        this.guardando = false;
        this.limpiarFormulario();

        const alert = await this.alertController.create({
          header: '¡Compra Registrada!',
          message: 'La orden de compra ha sido registrada con éxito. ¿Quieres ver el historial de compras?',
          backdropDismiss: false,
          buttons: [
            {
              text: 'No, crear otra',
              role: 'cancel',
              handler: () => {
                this.activeTab = 'nueva';
              }
            },
            {
              text: 'Sí, ver historial',
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

  private limpiarFormulario(): void {
    this.proveedorNombre = '';
    this.totalCompra = null;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
