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
  apellido = '';
  tipoDocumento = 'CC';
  documento = '';
  telefono = '';
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
    if (
      !this.nombre ||
      !this.apellido ||
      !this.tipoDocumento ||
      !this.documento ||
      !this.telefono ||
      !this.email ||
      !this.password
    ) {
      this.errorMessage = 'Por favor completa todos los campos requeridos.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const usernameGenerated = this.email.includes('@')
      ? this.email.split('@')[0]
      : this.email.trim();

    const payload = {
      nombre: this.nombre.trim(),
      apellido: this.apellido.trim(),
      tipo_documento: this.tipoDocumento,
      documento: this.documento.trim(),
      telefono: this.telefono.trim(),
      email: this.email.trim(),
      username: usernameGenerated,
      password: this.password,
      id_rol: 2 // Rol Vendedor / Usuario por defecto
    };

    this.authService.register(payload).subscribe({
      next: async (res) => {
        this.loading = false;
        const toast = await this.toastController.create({
          message: '¡Cuenta creada con éxito! Inicia sesión con tu correo y contraseña.',
          duration: 3500,
          color: 'success',
          position: 'top'
        });
        await toast.present();
        this.router.navigate(['/login']);
      },
      error: async (err) => {
        this.loading = false;
        console.error('Error al registrar usuario:', err);
        this.errorMessage = err?.error?.mensaje || err?.error?.error || 'No se pudo crear la cuenta. Verifica que el documento o correo no estén ya registrados.';
      }
    });
  }
}
