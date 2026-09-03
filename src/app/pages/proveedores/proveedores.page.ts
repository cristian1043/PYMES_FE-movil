import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController, AlertController, ToastController } from '@ionic/angular/lazy';
import { AuthService } from '../../services/auth.service';
import { ProveedoresService, Proveedor } from '../../services/proveedores.service';

@Component({
  selector: 'app-proveedores',
  templateUrl: './proveedores.page.html',
  styleUrls: ['./proveedores.page.scss'],
  standalone: false
})
export class ProveedoresPage implements OnInit {
  activeTab: 'hub' | 'nuevo' | 'listado' = 'hub';

  proveedores: Proveedor[] = [];
  loading = false;
  usuario: any = null;
  currentPage = 1;
  totalPages = 1;
  hasMorePages = true;

  // Formulario nuevo proveedor
  nombreProveedor = '';
  nitProveedor = '';
  contactoProveedor = '';
  telefonoProveedor = '';
  emailProveedor = '';
  guardando = false;

  constructor(
    private authService: AuthService,
    private proveedoresService: ProveedoresService,
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

  seleccionarAccion(accion: 'nuevo' | 'listado'): void {
    this.activeTab = accion;
    if (accion === 'listado') {
      this.cargarProveedores(1, true);
    }
  }

  cargarProveedores(page: number = 1, isInitial: boolean = false, event?: any): void {
    if (isInitial) {
      this.loading = true;
      this.currentPage = 1;
      this.proveedores = [];
    }

    this.proveedoresService.getProveedores(page, 15).subscribe({
      next: (res) => {
        this.loading = false;
        if (event) event.target.complete();

        let newItems: Proveedor[] = [];
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
          this.proveedores = newItems;
        } else {
          this.proveedores = [...this.proveedores, ...newItems];
        }
      },
      error: (err) => {
        this.loading = false;
        if (event) event.target.complete();
        console.error('Error al cargar proveedores:', err);
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
    this.cargarProveedores(this.currentPage, false, event);
  }

  handleRefresh(event: any): void {
    this.cargarProveedores(1, true, event);
  }

  async onRegistrarProveedor(): Promise<void> {
    if (!this.nombreProveedor) {
      const toast = await this.toastController.create({
        message: 'Por favor ingresa el nombre de la empresa o proveedor.',
        duration: 2500,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    this.guardando = true;

    this.proveedoresService.createProveedor({
      nombre: this.nombreProveedor.trim(),
      nit_documento: (this.nitProveedor || '').trim(),
      contacto: (this.contactoProveedor || '').trim(),
      telefono: (this.telefonoProveedor || '').trim(),
      email: (this.emailProveedor || '').trim()
    }).subscribe({
      next: async (res) => {
        this.guardando = false;
        this.limpiarFormulario();

        const alert = await this.alertController.create({
          header: '¡Proveedor Registrado!',
          message: 'El proveedor ha sido registrado con éxito. ¿Quieres ver el directorio de proveedores?',
          backdropDismiss: false,
          buttons: [
            {
              text: 'No, crear otro',
              role: 'cancel',
              handler: () => {
                this.activeTab = 'nuevo';
              }
            },
            {
              text: 'Sí, ver directorio',
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
        console.error('Error al registrar proveedor:', err);
        const toast = await this.toastController.create({
          message: err?.error?.mensaje || 'No se pudo registrar el proveedor. Intenta nuevamente.',
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
    });
  }

  private limpiarFormulario(): void {
    this.nombreProveedor = '';
    this.nitProveedor = '';
    this.contactoProveedor = '';
    this.telefonoProveedor = '';
    this.emailProveedor = '';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
