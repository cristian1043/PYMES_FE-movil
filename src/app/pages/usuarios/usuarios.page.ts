import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
  loading = false;
  usuario: any = null;
  currentPage = 1;
  totalPages = 1;
  hasMorePages = true;

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
    private menuStateService: MenuStateService,
    private toastController: ToastController
  ) {}

  ngOnInit(): void {
    this.verificarAutenticacion();
  }

  ionViewWillEnter(): void {
    this.verificarAutenticacion();
    if (this.activeTab === 'listado') {
      this.cargarUsuarios(1, true);
    }
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
    }
  }

  seleccionarAccion(accion: 'nuevo' | 'listado'): void {
    this.activeTab = accion;
    if (accion === 'listado') {
      this.cargarUsuarios(1, true);
    }
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
      },
      error: () => {
        this.usernameChecking = false;
      }
    });
  }

  cargarUsuarios(page: number = 1, isInitial: boolean = false, event?: any): void {
    if (isInitial) {
      this.loading = true;
      this.currentPage = 1;
      this.usuarios = [];
    }

    this.usuariosService.getUsuarios(page, 15)
      .pipe(
        finalize(() => {
          this.loading = false;
          if (event) event.target.complete();
        })
      )
      .subscribe({
        next: (res) => {
          let newItems: UsuarioItem[] = [];
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
            this.usuarios = newItems;
          } else {
            this.usuarios = [...this.usuarios, ...newItems];
          }
        },
        error: (err) => {
          console.error('Error al cargar usuarios:', err);
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
    this.cargarUsuarios(this.currentPage, false, event);
  }

  handleRefresh(event: any): void {
    this.cargarUsuarios(1, true, event);
  }

  getNombreRol(idRol: number): string {
    switch (idRol) {
      case 1: return 'Administrador';
      case 2: return 'Vendedor';
      case 3: return 'Almacenista';
      default: return 'Usuario';
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
      })
    )
    .subscribe({
      next: (res) => {
        this.limpiarFormulario();
        this.modalTitulo = '¡Usuario Registrado Exitosamente!';
        this.modalMensaje = `El usuario @${res.username} ha sido registrado y se le ha notificado a su correo ${res.email} con sus credenciales de acceso. ¿Deseas ver la lista de usuarios?`;
        this.mostrarModalConfirmacion = true;
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
