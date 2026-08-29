import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular/lazy';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage {
  nombre = '';
  username = '';
  email = '';
  password = '';
  loading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController
  ) {}

  onRegister(): void {
    if (!this.nombre || !this.username || !this.email || !this.password) return;

    this.loading = true;
    this.errorMessage = '';

    const parts = this.nombre.trim().split(' ');
    const firstNombre = parts[0] || this.nombre;
    const apellido = parts.slice(1).join(' ') || 'PYME';

    const payload = {
      nombre: firstNombre,
      apellido: apellido,
      username: this.username,
      email: this.email,
      password: this.password,
      id_rol: 2 // Rol Vendedor / Usuario por defecto
    };

    this.authService.register(payload).subscribe({
      next: async (res) => {
        this.loading = false;
        const toast = await this.toastController.create({
          message: '¡Cuenta creada con éxito! Inicia sesión con tus credenciales.',
          duration: 3000,
          color: 'success',
          position: 'top'
        });
        await toast.present();
        this.router.navigate(['/login']);
      },
      error: async (err) => {
        this.loading = false;
        console.error('Error al registrar usuario:', err);
        this.errorMessage = err?.error?.mensaje || err?.error?.error || 'No se pudo crear la cuenta. Intenta de nuevo.';
      }
    });
  }
}
