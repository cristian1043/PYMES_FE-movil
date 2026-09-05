import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastController } from '@ionic/angular/lazy';
import { AuthService } from '../../services/auth.service';
import { UsuariosService, UsuarioItem } from '../../services/usuarios.service';
import { MenuStateService } from '../../services/menu-state.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.page.html',
  styleUrls: ['./usuarios.page.scss'],
  standalone: false
})
export class UsuariosPage implements OnInit {
  activeTab: 'hub' | 'nuevo' | 'listado' = 'hub';

  usuarios: UsuarioItem[] = [];
  usuariosFiltrados: UsuarioItem[] = [];
  loading = false;
  usuario: any = null;
  currentPage = 1;
  totalPages = 1;
  totalUsuarios = 0;
  hasMorePages = false;

  // Filtros de búsqueda
  searchTerm = '';
  filtroRol: number | 'todos' = 'todos';
  filtroEstado: 'todos' | 'Activo' | 'Inactivo' = 'todos';

  // Modal de detalle de usuario
  usuarioSeleccionado: UsuarioItem | null = null;
  mostrarModalDetalle = false;

  // Modal de Edición de Usuario
  mostrarModalEdicion = false;
  usuarioEditando: Partial<UsuarioItem> = {};
  guardandoEdicion = false;

  // Confirmación de Cambio de Estado (Activar/Desactivar)
  mostrarModalConfirmacionEstado = false;
  usuarioParaCambioEstado: UsuarioItem | null = null;
  nuevoEstadoPendiente = 'Activo';

  // Formulario nuevo usuario
  nombreUser = '';
  apellidoUser = '';
  tipoDocumentoUser = 'CC';
  documentoUser = '';
  telefonoUser = '';
  usernameUser = '';
  emailUser = '';
  passwordUser = '';
  idRolUser = 2; // Default Vendedor
  guardando = false;

  // Validación de Username en tiempo real
  usernameChecking = false;
  usernameError = '';
  usernameSuccess = '';

  // Modal de confirmación personalizado
  mostrarModalConfirmacion = false;
  modalTitulo = '';
  modalMensaje = '';

  constructor(
    private authService: AuthService,
    private usuariosService: UsuariosService,
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
      this.cargarUsuarios(this.currentPage || 1, true);
    }
    this.cdr.detectChanges();
  }

  private verificarAutenticacion(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }
    this.usuario = this.authService.getUsuario();
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
      this.cargarUsuarios(1, true);
    }
    this.cdr.detectChanges();
  }

  onUsernameChange(): void {
    const val = (this.usernameUser || '').trim();
    this.usernameError = '';
    this.usernameSuccess = '';

    if (!val) {
      return;
    }

    if (val.length < 3) {
      this.usernameError = 'El nombre de usuario debe tener al menos 3 caracteres.';
      return;
    }

    this.usernameChecking = true;
    this.usuariosService.checkUsernameDisponible(val).subscribe({
      next: (res) => {
        this.usernameChecking = false;
        if (res && res.disponible) {
          this.usernameSuccess = '✓ Nombre de usuario disponible';
          this.usernameError = '';
        } else {
          this.usernameError = '✕ Este nombre de usuario ya está en uso. Elige otro.';
          this.usernameSuccess = '';
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.usernameChecking = false;
        this.cdr.detectChanges();
      }
    });
  }

  cargarUsuarios(page: number = 1, isInitial: boolean = false, event?: any): void {
    if (isInitial) {
      this.loading = true;
      this.currentPage = 1;
      this.usuarios = [];
      this.usuariosFiltrados = [];
      this.cdr.detectChanges();
    }

    this.usuariosService.getUsuarios(page, 20)
      .pipe(
        finalize(() => {
          this.loading = false;
          if (event) event.target.complete();
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res) => {
          let newItems: UsuarioItem[] = [];
          if (Array.isArray(res)) {
            newItems = res;
            this.totalUsuarios = res.length;
            this.hasMorePages = false;
          } else if (res && res.items && Array.isArray(res.items)) {
            newItems = res.items;
            this.totalUsuarios = res.total || newItems.length;
            this.totalPages = res.total_pages || 1;
            this.hasMorePages = page < this.totalPages;
          } else {
            newItems = [];
            this.totalUsuarios = 0;
            this.hasMorePages = false;
          }

          if (isInitial) {
            this.usuarios = newItems;
          } else {
            this.usuarios = [...this.usuarios, ...newItems];
          }
          this.filtrarUsuarios();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error al cargar usuarios:', err);
          this.cdr.detectChanges();
        }
      });
  }

  filtrarUsuarios(): void {
    let filtrados = [...this.usuarios];

    // Filtro por rol
    if (this.filtroRol !== 'todos') {
      filtrados = filtrados.filter(u => Number(u.id_rol) === Number(this.filtroRol));
    }

    // Filtro por estado
    if (this.filtroEstado !== 'todos') {
      filtrados = filtrados.filter(u => {
        const est = (u.estado || 'Activo').toLowerCase();
        return this.filtroEstado === 'Activo' ? est === 'activo' : est !== 'activo';
      });
    }

    // Filtro por texto de búsqueda
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase().trim();
      filtrados = filtrados.filter(u =>
        (u.nombre && u.nombre.toLowerCase().includes(term)) ||
        (u.apellido && u.apellido.toLowerCase().includes(term)) ||
        (u.username && u.username.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        (u.documento && u.documento.toLowerCase().includes(term))
      );
    }

    this.usuariosFiltrados = filtrados;
    this.cdr.detectChanges();
  }

  verDetalleUsuario(u: UsuarioItem): void {
    this.usuarioSeleccionado = u;
    this.mostrarModalDetalle = true;
    this.cdr.detectChanges();
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle = false;
    this.usuarioSeleccionado = null;
    this.cdr.detectChanges();
  }

  solicitarCambioEstado(usuario: UsuarioItem, event?: Event): void {
    if (event) event.stopPropagation();
    this.usuarioParaCambioEstado = usuario;
    const estActual = (usuario.estado || 'Activo').toLowerCase();
    this.nuevoEstadoPendiente = estActual === 'activo' ? 'Inactivo' : 'Activo';
    this.mostrarModalConfirmacionEstado = true;
    this.cdr.detectChanges();
  }

  confirmarCambioEstado(): void {
    if (!this.usuarioParaCambioEstado || !this.usuarioParaCambioEstado.id) return;
    const id = this.usuarioParaCambioEstado.id;
    const nuevoEstado = this.nuevoEstadoPendiente;
    this.mostrarModalConfirmacionEstado = false;

    this.usuariosService.cambiarEstado(id, nuevoEstado).subscribe({
      next: async () => {
        if (this.usuarioSeleccionado && this.usuarioSeleccionado.id === id) {
          this.usuarioSeleccionado.estado = nuevoEstado;
        }
        const u = this.usuarios.find(x => x.id === id);
        if (u) u.estado = nuevoEstado;
        this.filtrarUsuarios();
        this.cdr.detectChanges();

        const toast = await this.toastController.create({
          message: `El usuario ahora está ${nuevoEstado === 'Activo' ? 'Activo 🟢' : 'Desvinculado / Inactivo 🔴'}`,
          duration: 3000,
          color: nuevoEstado === 'Activo' ? 'success' : 'dark',
          position: 'top'
        });
        await toast.present();
      },
      error: async (err) => {
        console.error('Error al cambiar estado:', err);
        const toast = await this.toastController.create({
          message: 'Error al cambiar estado del usuario.',
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
    });
  }

  cancelarCambioEstado(): void {
    this.mostrarModalConfirmacionEstado = false;
    this.usuarioParaCambioEstado = null;
    this.cdr.detectChanges();
  }

  cambiarRolUsuario(usuario: UsuarioItem, nuevoRolId: number): void {
    if (!usuario.id) return;
    this.usuariosService.cambiarRol(usuario.id, nuevoRolId).subscribe({
      next: async () => {
        usuario.id_rol = nuevoRolId;
        usuario.rol_nombre = this.getNombreRol(nuevoRolId);
        if (this.usuarioSeleccionado && this.usuarioSeleccionado.id === usuario.id) {
          this.usuarioSeleccionado.id_rol = nuevoRolId;
          this.usuarioSeleccionado.rol_nombre = this.getNombreRol(nuevoRolId);
        }
        this.filtrarUsuarios();
        this.cdr.detectChanges();

        const toast = await this.toastController.create({
          message: `Rol asignado: ${this.getNombreRol(nuevoRolId)}`,
          duration: 2500,
          color: 'primary',
          position: 'top'
        });
        await toast.present();
      },
      error: async () => {
        const toast = await this.toastController.create({
          message: 'Error al cambiar el rol del usuario.',
          duration: 2500,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
    });
  }

  abrirModalEdicion(usuario: UsuarioItem): void {
    this.usuarioEditando = {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido || '',
      tipo_documento: usuario.tipo_documento || 'CC',
      documento: usuario.documento || '',
      telefono: usuario.telefono || '',
      email: usuario.email,
      username: usuario.username,
      id_rol: Number(usuario.id_rol),
      estado: usuario.estado || 'Activo',
      banco: usuario.banco || '',
      tipo_cuenta: usuario.tipo_cuenta || 'Ahorros',
      numero_cuenta: usuario.numero_cuenta || ''
    };
    this.mostrarModalEdicion = true;
    this.cdr.detectChanges();
  }

  cerrarModalEdicion(): void {
    this.mostrarModalEdicion = false;
    this.usuarioEditando = {};
    this.cdr.detectChanges();
  }

  guardarEdicionUsuario(): void {
    if (!this.usuarioEditando.id) return;
    if (!this.usuarioEditando.nombre || !this.usuarioEditando.email) {
      this.toastController.create({
        message: 'Nombre y correo electrónico son requeridos.',
        duration: 2500,
        color: 'warning',
        position: 'top'
      }).then(t => t.present());
      return;
    }

    this.guardandoEdicion = true;
    const id = this.usuarioEditando.id;
    this.usuariosService.updateUsuario(id, this.usuarioEditando)
      .pipe(finalize(() => {
        this.guardandoEdicion = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: async () => {
          const idx = this.usuarios.findIndex(u => u.id === id);
          if (idx !== -1) {
            this.usuarios[idx] = { ...this.usuarios[idx], ...this.usuarioEditando } as UsuarioItem;
          }
          if (this.usuarioSeleccionado && this.usuarioSeleccionado.id === id) {
            this.usuarioSeleccionado = { ...this.usuarioSeleccionado, ...this.usuarioEditando } as UsuarioItem;
          }
          this.filtrarUsuarios();
          this.cerrarModalEdicion();

          const toast = await this.toastController.create({
            message: 'Datos del trabajador actualizados exitosamente.',
            duration: 3000,
            color: 'success',
            position: 'top'
          });
          await toast.present();
        },
        error: async (err) => {
          const toast = await this.toastController.create({
            message: err?.error?.mensaje || 'Error al actualizar el usuario.',
            duration: 3000,
            color: 'danger',
            position: 'top'
          });
          await toast.present();
        }
      });
  }

  cambiarPagina(delta: number): void {
    const nuevaPagina = this.currentPage + delta;
    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPages) {
      this.currentPage = nuevaPagina;
      this.cargarUsuarios(this.currentPage, true);
    }
  }

  loadMoreData(event: any): void {
    if (!this.hasMorePages) {
      event.target.disabled = true;
      event.target.complete();
      return;
    }
    this.currentPage++;
    this.cargarUsuarios(this.currentPage, false, event);
  }

  handleRefresh(event: any): void {
    this.cargarUsuarios(this.currentPage, true, event);
  }

  getNombreRol(idRol: number): string {
    switch (Number(idRol)) {
      case 1: return 'Administrador';
      case 2: return 'Vendedor';
      case 3: return 'Almacenista';
      default: return 'Usuario';
    }
  }

  getColorRol(idRol: number): string {
    switch (Number(idRol)) {
      case 1: return 'primary';  // Azul Corporativo
      case 2: return 'success';  // Verde Exitoso
      case 3: return 'warning';  // Amarillo Almacén
      default: return 'medium';
    }
  }

  async onRegistrarUsuario(): Promise<void> {
    if (this.guardando) return;

    if (!this.nombreUser || !this.usernameUser || !this.emailUser || !this.passwordUser) {
      const toast = await this.toastController.create({
        message: 'Por favor completa todos los campos obligatorios (*).',
        duration: 2500,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    if (this.usernameError) {
      const toast = await this.toastController.create({
        message: this.usernameError,
        duration: 3000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    this.guardando = true;

    this.usuariosService.createUsuario({
      nombre: this.nombreUser.trim(),
      apellido: (this.apellidoUser || '').trim(),
      tipo_documento: this.tipoDocumentoUser || 'CC',
      documento: (this.documentoUser || '').trim(),
      telefono: (this.telefonoUser || '').trim(),
      username: this.usernameUser.trim(),
      email: this.emailUser.trim(),
      password: this.passwordUser.trim(),
      id_rol: Number(this.idRolUser)
    })
    .pipe(
      finalize(() => {
        this.guardando = false;
        this.cdr.detectChanges();
      })
    )
    .subscribe({
      next: (res) => {
        this.limpiarFormulario();
        this.modalTitulo = '¡Usuario Registrado Exitosamente!';
        this.modalMensaje = `El usuario @${res.username} ha sido registrado y se le ha notificado a su correo ${res.email} con sus credenciales de acceso. ¿Deseas ver la lista de usuarios?`;
        this.mostrarModalConfirmacion = true;
        this.cdr.detectChanges();
      },
      error: async (err) => {
        console.error('Error al registrar usuario:', err);
        const toast = await this.toastController.create({
          message: err?.error?.mensaje || 'No se pudo registrar el usuario. Intenta nuevamente.',
          duration: 3500,
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
    this.nombreUser = '';
    this.apellidoUser = '';
    this.tipoDocumentoUser = 'CC';
    this.documentoUser = '';
    this.telefonoUser = '';
    this.usernameUser = '';
    this.emailUser = '';
    this.passwordUser = '';
    this.idRolUser = 2;
    this.usernameError = '';
    this.usernameSuccess = '';
  }
}
