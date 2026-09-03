import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController, ToastController } from '@ionic/angular/lazy';
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

  // Modal de confirmación personalizado
  mostrarModalConfirmacion = false;
  modalTitulo = '';
  modalMensaje = '';

  constructor(
    private authService: AuthService,
    private proveedoresService: ProveedoresService,
    private router: Router,
    private menuCtrl: MenuController,
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
      next: (res) => {
        this.guardando = false;
        this.limpiarFormulario();
        this.modalTitulo = '¡Proveedor Registrado!';
        this.modalMensaje = 'El proveedor ha sido registrado con éxito. ¿Quieres ver el directorio de proveedores?';
        this.mostrarModalConfirmacion = true;
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

  responderModal(verListado: boolean): void {
    this.mostrarModalConfirmacion = false;
    this.limpiarFormulario();
    if (verListado) {
      this.seleccionarAccion('listado');
    } else {
      this.activeTab = 'nuevo';
    }
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
