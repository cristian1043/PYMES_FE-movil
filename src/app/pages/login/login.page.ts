import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular/lazy';
import { AuthService } from '../../services/auth.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {
  username = '';
  password = '';
  loading = false;
  errorMessage = '';
  // Estado del Modal de Recuperación de Contraseña
  modalRecuperarAbierto = false;
  pasoRecuperacion = 1;
  recuperarIdentificador = '';
  recuperarCodigo = '';
  recuperarNuevaPassword = '';
  recuperarConfirmarPassword = '';
  recuperando = false;
  recuperarError = '';
  mensajePaso2 = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.resetState();
  }

  ionViewWillEnter(): void {
    this.resetState();
  }

  private resetState(): void {
    this.loading = false;
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  irARegistro(): void {
    this.router.navigate(['/register']);
  }

  abrirModalRecuperar(): void {
    this.modalRecuperarAbierto = true;
    this.pasoRecuperacion = 1;
    this.recuperarIdentificador = '';
    this.recuperarCodigo = '';
    this.recuperarNuevaPassword = '';
    this.recuperarConfirmarPassword = '';
    this.recuperarError = '';
    this.mensajePaso2 = '';
    this.cdr.detectChanges();
  }

  cerrarModalRecuperar(): void {
    this.modalRecuperarAbierto = false;
    this.recuperando = false;
    this.recuperarError = '';
    this.cdr.detectChanges();
  }

  solicitarCodigo(): void {
    const idTrim = (this.recuperarIdentificador || '').trim();
    if (!idTrim) {
      this.recuperarError = 'Ingresa tu correo, usuario o documento.';
      this.cdr.detectChanges();
      return;
    }

    this.recuperando = true;
    this.recuperarError = '';
    this.cdr.detectChanges();

    this.authService.solicitarRecuperacionPassword(idTrim).pipe(
      finalize(() => {
        this.recuperando = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: async (res: any) => {
        if (res && res.exito) {
          this.pasoRecuperacion = 2;
          this.recuperarCodigo = res.codigo || '';
          this.mensajePaso2 = `Se ha generado la solicitud para ${res.email_enmascarado || idTrim}. Revisa el código OTP recibido.`;
          this.cdr.detectChanges();
          const toast = await this.toastController.create({
            message: '¡Código de verificación generado y despachado!',
            duration: 3500,
            color: 'success',
            position: 'top'
          });
          await toast.present();
        } else {
          this.recuperarError = res?.mensaje || 'No se pudo generar la solicitud.';
          this.cdr.detectChanges();
        }
      },
      error: (err: any) => {
        console.error('Error al solicitar código:', err);
        this.recuperarError = err?.error?.mensaje || 'No se encontró una cuenta con ese correo, usuario o documento.';
        this.cdr.detectChanges();
      }
    });
  }

  confirmarNuevaPassword(): void {
    const codigoTrim = (this.recuperarCodigo || '').trim();
    const nuevaPass = (this.recuperarNuevaPassword || '').trim();
    const confPass = (this.recuperarConfirmarPassword || '').trim();

    if (!codigoTrim) {
      this.recuperarError = 'El código de verificación es obligatorio.';
      this.cdr.detectChanges();
      return;
    }

    if (!nuevaPass || nuevaPass.length < 6) {
      this.recuperarError = 'La nueva contraseña debe contener al menos 6 caracteres.';
      this.cdr.detectChanges();
      return;
    }

    if (nuevaPass !== confPass) {
      this.recuperarError = 'Las contraseñas no coinciden.';
      this.cdr.detectChanges();
      return;
    }

    this.recuperando = true;
    this.recuperarError = '';
    this.cdr.detectChanges();

    this.authService.confirmarRecuperacionPassword(codigoTrim, nuevaPass).pipe(
      finalize(() => {
        this.recuperando = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: async (res: any) => {
        if (res && res.exito) {
          this.cerrarModalRecuperar();
          const toast = await this.toastController.create({
            message: '¡Contraseña restablecida con éxito! Ya puedes iniciar sesión.',
            duration: 4000,
            color: 'success',
            position: 'top'
          });
          await toast.present();
          this.password = '';
          this.cdr.detectChanges();
        } else {
          this.recuperarError = res?.mensaje || 'No se pudo restablecer la contraseña.';
          this.cdr.detectChanges();
        }
      },
      error: (err: any) => {
        console.error('Error al confirmar contraseña:', err);
        this.recuperarError = err?.error?.mensaje || 'El código ingresado es inválido o ha expirado.';
        this.cdr.detectChanges();
      }
    });
  }

  onLogin(): void {
    if (this.loading) return;

    const userTrim = (this.username || '').trim();
    const passTrim = (this.password || '').trim();

    if (!userTrim || !passTrim) {
      this.errorMessage = 'Por favor ingresa tu usuario y contraseña.';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.authService.login({
      username: userTrim,
      password: passTrim
    })
    .pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    )
    .subscribe({
      next: async (res) => {
        if (res && res.exito) {
          const toast = await this.toastController.create({
            message: `¡Bienvenido ${res.usuario?.nombre || res.usuario?.username || 'al sistema'}!`,
            duration: 2000,
            color: 'success',
            position: 'top'
          });
          await toast.present();
          this.router.navigateByUrl('/seleccionar-empresa');
        } else {
          this.errorMessage = res?.mensaje || 'Credenciales incorrectas.';
          this.loading = false;
          this.cdr.detectChanges();
          const toast = await this.toastController.create({
            message: this.errorMessage,
            duration: 3500,
            color: 'danger',
            position: 'top',
            buttons: [{ text: 'OK', role: 'cancel' }]
          });
          await toast.present();
        }
      },
      error: async (err) => {
        console.error('Error en inicio de sesión:', err);
        if (err.status === 401) {
          this.errorMessage = err?.error?.mensaje || 'Usuario o contraseña incorrectos. Verifica tus credenciales.';
        } else if (err.status === 429) {
          this.errorMessage = err?.error?.mensaje || '⚠️ Demasiados intentos fallidos. Bloqueo de seguridad activado. Espera 1 minuto.';
        } else if (err.status === 0) {
          this.errorMessage = 'No se pudo conectar con el servidor. Verifica que Flask esté encendido.';
        } else {
          this.errorMessage = err?.error?.mensaje || 'Error al iniciar sesión. Intenta nuevamente.';
        }

        this.loading = false;
        this.cdr.detectChanges();

        const toast = await this.toastController.create({
          message: this.errorMessage,
          duration: 4000,
          color: 'danger',
          position: 'top',
          buttons: [{ text: 'OK', role: 'cancel' }]
        });
        await toast.present();
      }
    });
  }
}


