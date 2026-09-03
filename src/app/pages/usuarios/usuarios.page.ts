import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController, ToastController } from '@ionic/angular/lazy';
import { AuthService } from '../../services/auth.service';
import { UsuariosService, UsuarioItem } from '../../services/usuarios.service';

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
  usernameUser = '';
  emailUser = '';
  passwordUser = '';
  idRolUser = 2; // Default Vendedor
  guardando = false;

  // Modal de confirmación personalizado
  mostrarModalConfirmacion = false;
  modalTitulo = '';
  modalMensaje = '';

  constructor(
    private authService: AuthService,
    private usuariosService: UsuariosService,
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
      this.cargarUsuarios(1, true);
    }
  }

  cargarUsuarios(page: number = 1, isInitial: boolean = false, event?: any): void {
    if (isInitial) {
      this.loading = true;
      this.currentPage = 1;
      this.usuarios = [];
    }

    this.usuariosService.getUsuarios(page, 15).subscribe({
      next: (res) => {
        this.loading = false;
        if (event) event.target.complete();

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
        this.loading = false;
        if (event) event.target.complete();
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
    if (!this.nombreUser || !this.usernameUser || !this.emailUser || !this.passwordUser) {
      const toast = await this.toastController.create({
        message: 'Por favor completa los campos obligatorios del usuario.',
        duration: 2500,
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
      username: this.usernameUser.trim(),
      email: this.emailUser.trim(),
      password: this.passwordUser.trim(),
      id_rol: Number(this.idRolUser)
    }).subscribe({
      next: (res) => {
        this.guardando = false;
        this.limpiarFormulario();
        this.modalTitulo = '¡Usuario Registrado!';
        this.modalMensaje = 'El nuevo usuario del sistema ha sido creado con éxito. ¿Quieres ver la lista de usuarios?';
        this.mostrarModalConfirmacion = true;
      },
      error: async (err) => {
        this.guardando = false;
        console.error('Error al registrar usuario:', err);
        const toast = await this.toastController.create({
          message: err?.error?.mensaje || 'No se pudo registrar el usuario. Intenta nuevamente.',
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
    this.nombreUser = '';
    this.apellidoUser = '';
    this.usernameUser = '';
    this.emailUser = '';
    this.passwordUser = '';
    this.idRolUser = 2;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
