import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { UsuariosService } from '../../services/usuarios.service';
import { MenuStateService } from '../../services/menu-state.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: false
})
export class PerfilPage implements OnInit {
  loading = false;
  guardando = false;
  usuario: any = null;
  empresaActiva: any = null;
  rolId: number = 2;
  rolNombre: string = 'Vendedor';

  // Modelo del formulario reactivo/táctil
  form = {
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    tipo_documento: 'CC',
    documento: '',
    username: '',
    banco: '',
    tipo_cuenta: 'Ahorros',
    numero_cuenta: '',
    passwordActual: '',
    password: '',
    confirmPassword: ''
  };

  // Copia de respaldo para cancelar/deshacer
  private formOriginal: any = null;

  // Control para visibilidad de campos de contraseña
  mostrarCambioPassword = false;

  constructor(
    private authService: AuthService,
    private usuariosService: UsuariosService,
    private menuStateService: MenuStateService,
    private router: Router,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarDatosPerfil();
  }

  ionViewWillEnter(): void {
    this.cargarDatosPerfil();
  }

  toggleMenu(): void {
    this.menuStateService.toggle();
  }

  irAIndex(): void {
    this.router.navigateByUrl('/inicio');
  }

  cargarDatosPerfil(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }

    this.usuario = this.authService.getUsuario();
    this.empresaActiva = this.authService.getEmpresaActiva();
    this.rolId = this.authService.getRolId();

    const rolesMap: Record<number, string> = {
      1: '👑 Administrador',
      2: '🏷️ Vendedor',
      3: '📦 Almacenista'
    };
    this.rolNombre = (this.empresaActiva && this.empresaActiva.rol_nombre)
      ? this.empresaActiva.rol_nombre
      : (rolesMap[this.rolId] || 'Usuario');

    this.poblarFormulario(this.usuario);

    // Consultar al backend por datos frescos completos
    if (this.usuario && this.usuario.id) {
      this.loading = true;
      this.usuariosService.getUsuarioById(this.usuario.id).pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      ).subscribe({
        next: (freshUser) => {
          if (freshUser) {
            this.usuario = { ...this.usuario, ...freshUser };
            this.authService.updateUsuarioEnStorage(this.usuario);
            this.poblarFormulario(this.usuario);
          }
        },
        error: (err) => {
          console.warn('No se pudo refrescar el usuario desde el servidor, usando datos de sesión:', err);
        }
      });
    }
  }

  private poblarFormulario(u: any): void {
    if (!u) return;
    this.form = {
      nombre: u.nombre || '',
      apellido: u.apellido || '',
      email: u.email || '',
      telefono: u.telefono || '',
      tipo_documento: u.tipo_documento || 'CC',
      documento: u.documento || '',
      username: u.username || '',
      banco: u.banco || '',
      tipo_cuenta: u.tipo_cuenta || 'Ahorros',
      numero_cuenta: u.numero_cuenta || '',
      passwordActual: '',
      password: '',
      confirmPassword: ''
    };
    this.formOriginal = { ...this.form };
    this.cdr.detectChanges();
  }

  toggleSeccionPassword(): void {
    this.mostrarCambioPassword = !this.mostrarCambioPassword;
    if (!this.mostrarCambioPassword) {
      this.form.passwordActual = '';
      this.form.password = '';
      this.form.confirmPassword = '';
    }
    this.cdr.detectChanges();
  }

  deshacerCambios(): void {
    if (this.formOriginal) {
      this.form = { ...this.formOriginal, passwordActual: '', password: '', confirmPassword: '' };
      this.mostrarCambioPassword = false;
      this.cdr.detectChanges();
      this.mostrarToast('Cambios revertidos a los valores guardados.', 'medium');
    }
  }

  async guardarPerfil(): Promise<void> {
    if (!this.usuario || !this.usuario.id) {
      this.mostrarToast('No se encontró una sesión válida de usuario.', 'danger');
      return;
    }

    // Validaciones básicas
    if (!this.form.nombre || this.form.nombre.trim() === '') {
      this.mostrarToast('El nombre es obligatorio.', 'warning');
      return;
    }

    if (!this.form.email || this.form.email.trim() === '') {
      this.mostrarToast('El correo electrónico es obligatorio.', 'warning');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.form.email.trim())) {
      this.mostrarToast('Por favor ingresa un correo electrónico válido.', 'warning');
      return;
    }

    if (!this.form.telefono || this.form.telefono.trim() === '') {
      this.mostrarToast('El número de teléfono es obligatorio.', 'warning');
      return;
    }

    // Validación de cambio de contraseña con exigencia de contraseña actual
    const quiereCambiarPassword = this.mostrarCambioPassword && (this.form.passwordActual || this.form.password || this.form.confirmPassword);
    if (quiereCambiarPassword) {
      if (!this.form.passwordActual || this.form.passwordActual.trim() === '') {
        this.mostrarToast('Debes ingresar tu contraseña actual para autorizar el cambio.', 'warning');
        return;
      }
      if (!this.form.password || this.form.password.length < 6) {
        this.mostrarToast('La nueva contraseña debe tener al menos 6 caracteres.', 'warning');
        return;
      }
      if (this.form.password !== this.form.confirmPassword) {
        this.mostrarToast('Las contraseñas no coinciden. Verifícalas.', 'warning');
        return;
      }
    }

    this.guardando = true;
    this.cdr.detectChanges();

    const payload: any = {
      nombre: this.form.nombre.trim(),
      apellido: this.form.apellido ? this.form.apellido.trim() : '',
      email: this.form.email.trim().toLowerCase(),
      telefono: this.form.telefono.trim(),
      tipo_documento: this.form.tipo_documento,
      documento: this.form.documento ? this.form.documento.trim() : '',
      banco: this.form.banco ? this.form.banco.trim() : '',
      tipo_cuenta: this.form.tipo_cuenta || 'Ahorros',
      numero_cuenta: this.form.numero_cuenta ? this.form.numero_cuenta.trim() : ''
    };

    // Función auxiliar para actualizar los datos personales en la base de datos
    const actualizarDatosGenerales = () => {
      this.usuariosService.updateUsuario(this.usuario.id, payload).pipe(
        finalize(() => {
          this.guardando = false;
          this.cdr.detectChanges();
        })
      ).subscribe({
        next: (res) => {
          const updated = {
            ...this.usuario,
            ...payload
          };
          this.usuario = updated;
          this.authService.updateUsuarioEnStorage(updated);
          this.formOriginal = { ...this.form, passwordActual: '', password: '', confirmPassword: '' };
          this.form.passwordActual = '';
          this.form.password = '';
          this.form.confirmPassword = '';
          this.mostrarCambioPassword = false;
          this.cdr.detectChanges();

          this.mostrarToast('¡Tu información personal ha sido actualizada con éxito!', 'success');
        },
        error: (err) => {
          console.error('Error al actualizar información personal:', err);
          const errorMsg = err?.error?.mensaje || 'No se pudo guardar la información personal.';
          this.mostrarToast(`Error: ${errorMsg}`, 'danger');
        }
      });
    };

    // Si el usuario solicitó cambio de clave, validamos y cambiamos la clave primero en el Backend
    if (quiereCambiarPassword) {
      this.authService.cambiarPassword(this.usuario.id, this.form.passwordActual, this.form.password).subscribe({
        next: () => {
          actualizarDatosGenerales();
        },
        error: (err) => {
          this.guardando = false;
          this.cdr.detectChanges();
          console.error('Error al cambiar contraseña:', err);
          const errorMsg = err?.error?.mensaje || 'La contraseña actual no es correcta.';
          this.mostrarToast(`Seguridad: ${errorMsg}`, 'danger');
        }
      });
    } else {
      actualizarDatosGenerales();
    }
  }

  private async mostrarToast(mensaje: string, color: 'success' | 'warning' | 'danger' | 'medium'): Promise<void> {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      color: color,
      position: 'top',
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }
}
