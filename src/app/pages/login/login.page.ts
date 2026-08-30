import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular/lazy';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage {
  username = '';
  password = '';
  loading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController
  ) {}

  onUsernameInput(ev: any): void {
    this.username = ev?.detail?.value || ev?.target?.value || '';
  }

  onPasswordInput(ev: any): void {
    this.password = ev?.detail?.value || ev?.target?.value || '';
  }

  onLogin(): void {
    const userTrim = (this.username || '').trim();
    const passTrim = (this.password || '').trim();

    if (!userTrim || !passTrim) {
      this.errorMessage = 'Por favor ingresa tu usuario y contraseña.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    // Safety timeout to prevent infinite spinner
    const timer = setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.errorMessage = 'El servidor tardó demasiado en responder. Verifica que Flask esté encendido.';
      }
    }, 6000);

    this.authService.login({
      username: userTrim,
      password: passTrim
    }).subscribe({
      next: async (res) => {
        clearTimeout(timer);
        this.loading = false;
        if (res.exito) {
          const toast = await this.toastController.create({
            message: `¡Bienvenido ${res.usuario?.nombre || res.usuario?.username || 'al sistema'}!`,
            duration: 2000,
            color: 'success',
            position: 'top'
          });
          await toast.present();
          this.router.navigateByUrl('/productos');
        } else {
          this.errorMessage = res.mensaje || 'Credenciales incorrectas.';
        }
      },
      error: async (err) => {
        clearTimeout(timer);
        this.loading = false;
        console.error('Error al conectar con la API:', err);
        this.errorMessage = err?.error?.mensaje || 'No se pudo conectar con el servidor. Verifica tu conexión.';
      }
    });
  }
}
