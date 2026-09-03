import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController, AlertController, ToastController } from '@ionic/angular/lazy';
import { AuthService } from '../../services/auth.service';
import { ClientesService, Cliente } from '../../services/clientes.service';

@Component({
  selector: 'app-clientes',
  templateUrl: './clientes.page.html',
  styleUrls: ['./clientes.page.scss'],
  standalone: false
})
export class ClientesPage implements OnInit {
  activeTab: 'hub' | 'nuevo' | 'listado' = 'hub';

  clientes: Cliente[] = [];
  loading = false;
  usuario: any = null;
  currentPage = 1;
  totalPages = 1;
  hasMorePages = true;

  // Formulario nuevo cliente
  nombreCliente = '';
  documentoCliente = '';
  telefonoCliente = '';
  emailCliente = '';
  direccionCliente = '';
  guardando = false;

  constructor(
    private authService: AuthService,
    private clientesService: ClientesService,
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
      this.cargarClientes(1, true);
    }
  }

  cargarClientes(page: number = 1, isInitial: boolean = false, event?: any): void {
    if (isInitial) {
      this.loading = true;
      this.currentPage = 1;
      this.clientes = [];
    }

    this.clientesService.getClientes(page, 15).subscribe({
      next: (res) => {
        this.loading = false;
        if (event) event.target.complete();

        let newItems: Cliente[] = [];
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
          this.clientes = newItems;
        } else {
          this.clientes = [...this.clientes, ...newItems];
        }
      },
      error: (err) => {
        this.loading = false;
        if (event) event.target.complete();
        console.error('Error al cargar clientes:', err);
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
    this.cargarClientes(this.currentPage, false, event);
  }

  handleRefresh(event: any): void {
    this.cargarClientes(1, true, event);
  }

  async onRegistrarCliente(): Promise<void> {
    if (!this.nombreCliente) {
      const toast = await this.toastController.create({
        message: 'Por favor ingresa el nombre del cliente.',
        duration: 2500,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    this.guardando = true;

    this.clientesService.createCliente({
      nombre: this.nombreCliente.trim(),
      documento: (this.documentoCliente || '').trim(),
      telefono: (this.telefonoCliente || '').trim(),
      email: (this.emailCliente || '').trim(),
      direccion: (this.direccionCliente || '').trim()
    }).subscribe({
      next: async (res) => {
        this.guardando = false;
        this.limpiarFormulario();

        const alert = await this.alertController.create({
          header: '¡Cliente Registrado!',
          message: 'El cliente ha sido registrado con éxito. ¿Quieres ver el directorio de clientes?',
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
        console.error('Error al registrar cliente:', err);
        const toast = await this.toastController.create({
          message: err?.error?.mensaje || 'No se pudo registrar el cliente. Intenta nuevamente.',
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
    });
  }

  private limpiarFormulario(): void {
    this.nombreCliente = '';
    this.documentoCliente = '';
    this.telefonoCliente = '';
    this.emailCliente = '';
    this.direccionCliente = '';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
