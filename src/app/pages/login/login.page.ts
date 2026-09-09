import { Component, OnInit } from '@angular/core';
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

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController
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
  }

  onLogin(): void {
    if (this.loading) return;

    const userTrim = (this.username || '').trim();
    const passTrim = (this.password || '').trim();

    if (!userTrim || !passTrim) {
      this.errorMessage = 'Por favor ingresa tu usuario y contraseña.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login({
      username: userTrim,
      password: passTrim
    })
    .pipe(
      finalize(() => {
        this.loading = false;
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
        }
      },
      error: (err) => {
        console.error('Error en inicio de sesión:', err);
        if (err.status === 401) {
          this.errorMessage = err?.error?.mensaje || 'Usuario o contraseña incorrectos.';
        } else if (err.status === 429) {
          this.errorMessage = err?.error?.mensaje || '⚠️ Demasiados intentos fallidos. Bloqueo de seguridad activado. Espera 1 minuto.';
        } else if (err.status === 0) {
          this.errorMessage = 'No se pudo conectar con el servidor. Verifica que Flask esté encendido.';
        } else {
          this.errorMessage = err?.error?.mensaje || 'Error al iniciar sesión. Intenta nuevamente.';
        }
      }
    });
  }
}
