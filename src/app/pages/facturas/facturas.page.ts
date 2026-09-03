import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController, AlertController, ToastController } from '@ionic/angular/lazy';
import { AuthService } from '../../services/auth.service';
import { FacturasService, Factura } from '../../services/facturas.service';

@Component({
  selector: 'app-facturas',
  templateUrl: './facturas.page.html',
  styleUrls: ['./facturas.page.scss'],
  standalone: false
})
export class FacturasPage implements OnInit {
  activeTab: 'hub' | 'nueva' | 'listado' = 'hub';

  facturas: Factura[] = [];
  loading = false;
  usuario: any = null;
  currentPage = 1;
  totalPages = 1;
  hasMorePages = true;

  // Formulario nueva factura
  clienteNombre = '';
  documentoCliente = '';
  montoTotal: number | null = null;
  metodoPago = 'Efectivo';
  guardando = false;

  constructor(
    private authService: AuthService,
    private facturasService: FacturasService,
    private router: Router,
    private menuCtrl: MenuController,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit(): void {
    this.usuario = this.authService.getUsuario();
  }

  ionViewWillEnter(): void {
    this.usuario = this.authService.getUsuario();
  }

  toggleMenu(): void {
    this.menuCtrl.toggle('main-menu');
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
      this.cargarFacturas(1, true);
    }
  }

  cargarFacturas(page: number = 1, isInitial: boolean = false, event?: any): void {
    if (isInitial) {
      this.loading = true;
      this.currentPage = 1;
      this.facturas = [];
    }

    this.facturasService.getFacturas(page, 15).subscribe({
      next: (res) => {
        this.loading = false;
        if (event) event.target.complete();

        let newItems: Factura[] = [];
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
          this.facturas = newItems;
        } else {
          this.facturas = [...this.facturas, ...newItems];
        }
      },
      error: (err) => {
        this.loading = false;
        if (event) event.target.complete();
        console.error('Error al cargar facturas:', err);
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
    this.cargarFacturas(this.currentPage, false, event);
  }

  handleRefresh(event: any): void {
    this.cargarFacturas(1, true, event);
  }

  async onCrearFactura(): Promise<void> {
    if (!this.clienteNombre || !this.montoTotal || this.montoTotal <= 0) {
      const toast = await this.toastController.create({
        message: 'Por favor ingresa el nombre del cliente y un monto válido.',
        duration: 2500,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    this.guardando = true;

    this.facturasService.createFactura({
      cliente_nombre: this.clienteNombre.trim(),
      total: Number(this.montoTotal),
      metodo_pago: this.metodoPago,
      estado: 'Emitida'
    }).subscribe({
      next: async (res) => {
        this.guardando = false;
        this.limpiarFormulario();

        const alert = await this.alertController.create({
          header: '¡Factura Registrada!',
          message: 'La factura ha sido registrada con éxito. ¿Quieres ver el historial de facturas?',
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
        console.error('Error al emitir factura:', err);
        const toast = await this.toastController.create({
          message: err?.error?.mensaje || 'No se pudo registrar la factura. Intenta nuevamente.',
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
    });
  }

  private limpiarFormulario(): void {
    this.clienteNombre = '';
    this.documentoCliente = '';
    this.montoTotal = null;
    this.metodoPago = 'Efectivo';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
