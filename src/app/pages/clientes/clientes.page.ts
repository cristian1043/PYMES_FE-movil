import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastController } from '@ionic/angular/lazy';
import { AuthService } from '../../services/auth.service';
import { ClientesService, Cliente } from '../../services/clientes.service';
import { MenuStateService } from '../../services/menu-state.service';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-clientes',
  templateUrl: './clientes.page.html',
  styleUrls: ['./clientes.page.scss'],
  standalone: false
})
export class ClientesPage implements OnInit, OnDestroy {
  activeTab: 'hub' | 'nuevo' | 'listado' = 'hub';

  clientes: Cliente[] = [];
  clientesFiltrados: Cliente[] = [];
  loading = false;
  usuario: any = null;
  rolId: number = 2; // 1: Admin, 2: Vendedor
  currentPage = 1;
  totalPages = 1;
  hasMorePages = true;

  // Filtro de búsqueda en tiempo real
  searchTerm = '';

  // Formulario nuevo cliente
  nombreCliente = '';
  apellidoCliente = '';
  tipoDocumentoCliente = 'CC';
  documentoCliente = '';
  telefonoCliente = '';
  emailCliente = '';
  direccionCliente = '';
  guardando = false;

  // Modales
  clienteSeleccionado: Cliente | null = null;
  mostrarModalDetalle = false;

  // Edición
  mostrarModalEdicion = false;
  clienteEditando: Partial<Cliente> = {};
  guardandoEdicion = false;

  // Eliminación (Solo Admin)
  mostrarModalEliminar = false;
  clienteParaEliminar: Cliente | null = null;
  eliminando = false;

  // Modal de confirmación tras registrar
  mostrarModalConfirmacion = false;
  modalTitulo = '';
  modalMensaje = '';

  private queryParamsSub?: Subscription;

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
    this.queryParamsSub = this.route.queryParamMap.subscribe((params) => {
      const tabParam = params.get('tab');
      const newTab = (tabParam === 'listado' || tabParam === 'nuevo') ? tabParam : 'hub';
      const tabChanged = this.activeTab !== newTab;
      this.activeTab = newTab;

      if (this.activeTab === 'listado') {
        if (tabChanged || this.clientes.length === 0) {
          this.cargarClientes(1, true);
        }
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
    const targetTab = (tabParam === 'listado' || tabParam === 'nuevo') ? tabParam : 'hub';
    this.activeTab = targetTab;
    if (this.activeTab === 'listado') {
      this.cargarClientes(1, true);
    }
    this.cdr.detectChanges();
  }

  private verificarAutenticacion(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }
    this.usuario = this.authService.getUsuario();
    this.rolId = this.authService.getRolId();
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
      this.currentPage = page;
      this.clientes = [];
      this.clientesFiltrados = [];
      this.cdr.detectChanges();
    }

    this.clientesService.getClientes(page, 10).subscribe({
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
        this.filtrarClientes();
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

  filtrarClientes(): void {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.clientesFiltrados = [...this.clientes];
      return;
    }
    const term = this.searchTerm.toLowerCase().trim();
    this.clientesFiltrados = this.clientes.filter(c =>
      (c.nombre && c.nombre.toLowerCase().includes(term)) ||
      (c.apellido && c.apellido.toLowerCase().includes(term)) ||
      (c.documento && c.documento.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.telefono && c.telefono.toLowerCase().includes(term)) ||
      (c.banco_tarjeta && c.banco_tarjeta.toLowerCase().includes(term))
    );
  }

  onSearchChange(): void {
    this.filtrarClientes();
    this.cdr.detectChanges();
  }

  cambiarPagina(delta: number): void {
    const targetPage = this.currentPage + delta;
    if (targetPage >= 1 && targetPage <= this.totalPages) {
      this.cargarClientes(targetPage, true);
    }
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

  verDetalleCliente(cliente: Cliente): void {
    this.clienteSeleccionado = cliente;
    this.mostrarModalDetalle = true;
    this.cdr.detectChanges();
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle = false;
    this.clienteSeleccionado = null;
    this.cdr.detectChanges();
  }

  abrirModalEdicion(cliente: Cliente, event?: Event): void {
    if (event) event.stopPropagation();
    if (this.rolId !== 1) {
      this.mostrarToast('Solo el Administrador tiene permisos para editar información de clientes.', 'warning');
      return;
    }
    this.clienteEditando = {
      id: cliente.id,
      nombre: cliente.nombre,
      apellido: cliente.apellido || '',
      tipo_documento: cliente.tipo_documento || 'CC',
      documento: cliente.documento || '',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      direccion: cliente.direccion || ''
    };
    this.mostrarModalEdicion = true;
    this.cdr.detectChanges();
  }

  cerrarModalEdicion(): void {
    this.mostrarModalEdicion = false;
    this.clienteEditando = {};
    this.cdr.detectChanges();
  }

  guardarEdicionCliente(): void {
    if (this.rolId !== 1) {
      this.mostrarToast('Solo el Administrador puede guardar cambios de clientes.', 'warning');
      return;
    }
    if (!this.clienteEditando.id || !this.clienteEditando.nombre) {
      this.mostrarToast('El nombre del cliente es obligatorio.', 'warning');
      return;
    }

    this.guardandoEdicion = true;
    this.cdr.detectChanges();

    const id = this.clienteEditando.id;
    this.clientesService.updateCliente(id, this.clienteEditando)
      .pipe(
        finalize(() => {
          this.guardandoEdicion = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: async (res) => {
          const idx = this.clientes.findIndex(c => c.id === id);
          if (idx !== -1) {
            this.clientes[idx] = { ...this.clientes[idx], ...res };
          }
          if (this.clienteSeleccionado && this.clienteSeleccionado.id === id) {
            this.clienteSeleccionado = { ...this.clienteSeleccionado, ...res };
          }
          this.filtrarClientes();
          this.cerrarModalEdicion();
          await this.mostrarToast('¡Cliente actualizado exitosamente!', 'success');
        },
        error: async (err) => {
          console.error('Error al actualizar cliente:', err);
          const msg = err?.error?.mensaje || 'Error al actualizar cliente.';
          await this.mostrarToast(msg, 'danger');
        }
      });
  }

  solicitarEliminarCliente(cliente: Cliente, event?: Event): void {
    if (event) event.stopPropagation();
    if (this.rolId !== 1) {
      this.mostrarToast('Solo el Administrador puede eliminar clientes.', 'warning');
      return;
    }
    this.clienteParaEliminar = cliente;
    this.mostrarModalEliminar = true;
    this.cdr.detectChanges();
  }

  cancelarEliminar(): void {
    this.mostrarModalEliminar = false;
    this.clienteParaEliminar = null;
    this.cdr.detectChanges();
  }

  confirmarEliminar(): void {
    if (!this.clienteParaEliminar || !this.clienteParaEliminar.id) return;
    const id = this.clienteParaEliminar.id;
    const nuevoEstado = (this.clienteParaEliminar.estado === 'Inactivo') ? 'Activo' : 'Inactivo';
    this.eliminando = true;

    this.clientesService.cambiarEstadoCliente(id, nuevoEstado)
      .pipe(
        finalize(() => {
          this.eliminando = false;
          this.mostrarModalEliminar = false;
          this.clienteParaEliminar = null;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: async () => {
          const cli = this.clientes.find(c => c.id === id);
          if (cli) {
            cli.estado = nuevoEstado;
          }
          if (this.clienteSeleccionado && this.clienteSeleccionado.id === id) {
            this.clienteSeleccionado.estado = nuevoEstado;
          }
          this.filtrarClientes();
          await this.mostrarToast(
            nuevoEstado === 'Inactivo'
              ? 'Cliente desactivado. Sus facturas se mantienen intactas.'
              : 'Cliente reactivado exitosamente.',
            'success'
          );
        },
        error: async (err) => {
          console.error('Error al cambiar estado del cliente:', err);
          const msg = err?.error?.mensaje || 'Error al actualizar estado del cliente.';
          await this.mostrarToast(msg, 'danger');
        }
      });
  }

  async onRegistrarCliente(): Promise<void> {
    if (!this.nombreCliente.trim()) {
      this.mostrarToast('Por favor ingresa el nombre del cliente.', 'warning');
      return;
    }

    this.guardando = true;
    this.cdr.detectChanges();

    const nuevoPayload: Cliente = {
      nombre: this.nombreCliente.trim(),
      apellido: this.apellidoCliente.trim(),
      tipo_documento: this.tipoDocumentoCliente,
      documento: this.documentoCliente.trim(),
      telefono: this.telefonoCliente.trim(),
      email: this.emailCliente.trim(),
      direccion: this.direccionCliente.trim()
    };

    this.clientesService.createCliente(nuevoPayload)
      .pipe(
        finalize(() => {
          this.guardando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res) => {
          this.limpiarFormulario();
          this.modalTitulo = '¡Cliente Registrado!';
          this.modalMensaje = 'El cliente ha sido registrado con éxito en la base de datos. ¿Quieres ver el directorio de clientes?';
          this.mostrarModalConfirmacion = true;
          this.cdr.detectChanges();
        },
        error: async (err) => {
          console.error('Error al registrar cliente:', err);
          const msg = err?.error?.mensaje || 'No se pudo registrar el cliente. Intenta nuevamente.';
          await this.mostrarToast(msg, 'danger');
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
    this.apellidoCliente = '';
    this.tipoDocumentoCliente = 'CC';
    this.documentoCliente = '';
    this.telefonoCliente = '';
    this.emailCliente = '';
    this.direccionCliente = '';
  }

  private async mostrarToast(mensaje: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      color: color,
      position: 'top'
    });
    await toast.present();
  }
}
