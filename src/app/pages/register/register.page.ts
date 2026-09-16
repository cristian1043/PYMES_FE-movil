import { Component, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular/lazy';
import { AuthService } from '../../services/auth.service';
import { finalize, timeout } from 'rxjs/operators';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage {
  nombre = '';
  apellido = '';
  tipoDocumento = 'CC';
  documento = '';
  telefono = '';
  email = '';
  password = '';
  fechaNacimiento = '';
  lugarResidencia = '';
  estadoCivil = 'Soltero(a)';
  numeroHijos = 0;
  banco = '';
  tipoCuenta = 'Ahorros';
  numeroCuenta = '';
  edadCalculada = '';

  loading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef
  ) {}

  irALogin(): void {
    this.router.navigate(['/login']);
  }

  onFechaNacimientoChange(): void {
    if (!this.fechaNacimiento) {
      this.edadCalculada = '';
      return;
    }
    const hoy = new Date();
    const cumple = new Date(this.fechaNacimiento);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const m = hoy.getMonth() - cumple.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) {
      edad--;
    }
    this.edadCalculada = `Edad: ${edad} años`;
    this.cdr.detectChanges();
  }

  onRegister(): void {
    if (
      !this.nombre ||
      !this.apellido ||
      !this.tipoDocumento ||
      !this.documento ||
      !this.telefono ||
      !this.email ||
      !this.password ||
      !this.fechaNacimiento ||
      !this.lugarResidencia
    ) {
      this.errorMessage = 'Por favor completa todos los campos requeridos (*).';
      this.cdr.detectChanges();
      return;
    }

    if (this.password.length < 4) {
      this.errorMessage = 'La contraseña debe tener al menos 4 caracteres.';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    const payload = {
      nombre: this.nombre.trim(),
      apellido: this.apellido.trim(),
      tipo_documento: this.tipoDocumento,
      documento: this.documento.trim(),
      telefono: this.telefono.trim(),
      email: this.email.trim().toLowerCase(),
      username: '', // El backend lo autogenera de forma única
      password: this.password,
      id_rol: 2,
      fecha_nacimiento: this.fechaNacimiento,
      lugar_residencia: this.lugarResidencia.trim(),
      estado_civil: this.estadoCivil,
      numero_hijos: Number(this.numeroHijos) || 0,
      banco: this.banco.trim(),
      tipo_cuenta: this.tipoCuenta,
      numero_cuenta: this.numeroCuenta.trim()
    };

    this.authService.register(payload).pipe(
      timeout(45000),
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: async (res: any) => {
        const uname = res?.username ? `@${res.username}` : '';
        const toast = await this.toastController.create({
          message: `¡Cuenta creada exitosamente! Tu identificador es ${uname}. Ya puedes iniciar sesión.`,
          duration: 4500,
          color: 'success',
          position: 'top'
        });
        await toast.present();
        this.router.navigate(['/login']);
      },
      error: async (err) => {
        console.error('Error al registrar usuario:', err);
        if (err?.status === 0 || err?.name === 'TimeoutError') {
          this.errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet o intenta de nuevo en unos segundos si el servidor se está activando.';
        } else if (err?.error?.mensaje) {
          this.errorMessage = err.error.mensaje;
        } else if (err?.error?.error) {
          this.errorMessage = err.error.error;
        } else {
          this.errorMessage = 'Error al registrar usuario. Verifica los datos e intenta nuevamente.';
        }
        this.cdr.detectChanges();
        const toast = await this.toastController.create({
          message: this.errorMessage,
          duration: 4500,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
    });
  }
}

