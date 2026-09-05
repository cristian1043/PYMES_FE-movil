import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastController } from '@ionic/angular/lazy';
import { AuthService } from '../../services/auth.service';
import { ClientesService, Cliente } from '../../services/clientes.service';
import { MenuStateService } from '../../services/menu-state.service';

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
  tipoDocumentoCliente = 'CC';
  documentoCliente = '';
  telefonoCliente = '';
  emailCliente = '';
  direccionCliente = '';
  ciudadCliente = '';
  guardando = false;

  // Modal de confirmación personalizado
  mostrarModalConfirmacion = false;
  modalTitulo = '';
  modalMensaje = '';

  constructor(
    private authService: AuthService,
    private clientesService: ClientesService,
    private router: Router,
    private route: ActivatedRoute,
    private menuStateService: MenuStateService,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.verificarAutenticacion();
    this.sincronizarTabDesdeUrl();
  }

  ionViewWillEnter(): void {
    this.verificarAutenticacion();
    this.sincronizarTabDesdeUrl();
  }

  private sincronizarTabDesdeUrl(): void {
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam === 'listado' || tabParam === 'nuevo') {
      this.activeTab = tabParam;
    } else {
      this.activeTab = 'hub';
    }

    if (this.activeTab === 'listado') {
      this.cargarClientes(this.currentPage || 1, true);
    }
    this.cdr.detectChanges();
  }

  private verificarAutenticacion(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }
    this.usuario = this.authService.getUsuario();
    this.cdr.detectChanges();
  }

  toggleMenu(): void {
    this.menuStateService.toggle();
  }

  irAIndex(): void {
    this.router.navigateByUrl('/inicio');
  }

  cancelarOVolver(): void {
    if (this.activeTab === 'hub') {
      this.router.navigateByUrl('/inicio');
    } else {
      this.activeTab = 'hub';
      this.router.navigate([], { relativeTo: this.route, queryParams: {} });
      this.cdr.detectChanges();
    }
  }

  seleccionarAccion(accion: 'nuevo' | 'listado'): void {
    this.activeTab = accion;
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab: accion } });
    if (accion === 'listado') {
      this.cargarClientes(1, true);
    }
    this.cdr.detectChanges();
  }

  cargarClientes(page: number = 1, isInitial: boolean = false, event?: any): void {
    if (isInitial) {
      this.loading = true;
      this.currentPage = 1;
      this.clientes = [];
      this.cdr.detectChanges();
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
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        if (event) event.target.complete();
        console.error('Error al cargar clientes:', err);
        this.cdr.detectChanges();
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
      next: (res) => {
        this.guardando = false;
        this.limpiarFormulario();
        this.modalTitulo = '¡Cliente Registrado!';
        this.modalMensaje = 'El cliente ha sido registrado con éxito. ¿Quieres ver el directorio de clientes?';
        this.mostrarModalConfirmacion = true;
        this.cdr.detectChanges();
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
        this.cdr.detectChanges();
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
    this.cdr.detectChanges();
  }

  private limpiarFormulario(): void {
    this.nombreCliente = '';
    this.documentoCliente = '';
    this.telefonoCliente = '';
    this.emailCliente = '';
    this.direccionCliente = '';
  }
}
