import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
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

  onLogin(): void {
    if (!this.username || !this.password) return;

    this.loading = true;
    this.errorMessage = '';

    this.authService.login({
      username: this.username,
      password: this.password
    }).subscribe({
      next: async (res) => {
        this.loading = false;
        if (res.exito) {
          const toast = await this.toastController.create({
            message: `¡Bienvenido ${res.usuario?.username || ''}!`,
            duration: 2000,
            color: 'success',
            position: 'top'
          });
          await toast.present();
          this.router.navigate(['/productos']);
        } else {
          this.errorMessage = res.mensaje || 'Credenciales incorrectas';
        }
      },
      error: async (err) => {
        this.loading = false;
        console.error('Error al conectar con la API:', err);
        this.errorMessage = err?.error?.mensaje || 'No se pudo conectar con el servidor. Verifica tu conexión.';
      }
    });
  }
}
