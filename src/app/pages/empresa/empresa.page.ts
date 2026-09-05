import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular/lazy';
import { AuthService } from '../../services/auth.service';
import { EmpresasService, Empresa } from '../../services/empresas.service';
import { MenuStateService } from '../../services/menu-state.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-empresa',
  templateUrl: './empresa.page.html',
  styleUrls: ['./empresa.page.scss'],
  standalone: false
})
export class EmpresaPage implements OnInit {
  empresa: Empresa | null = null;
  loading = false;
  guardando = false;
  usuario: any = null;

  // Campos de configuración
  nombre = '';
  nit = '';
  telefono = '';
  email = '';
  direccion = '';
  estado = 'Activo';

  // Modal de confirmación de cambio de estado operativo
  mostrarModalConfirmacionEstado = false;
  cambiandoEstado = false;

  constructor(
    private authService: AuthService,
    private empresasService: EmpresasService,
    private router: Router,
    private menuStateService: MenuStateService,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.verificarAutenticacion();
  }

  ionViewWillEnter(): void {
    this.verificarAutenticacion();
    this.cargarDatosEmpresa();
  }

  private verificarAutenticacion(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }
    this.usuario = this.authService.getUsuario();
    // Exclusivo para Administrador (Rol 1)
    if (this.authService.getRolId() !== 1) {
      this.router.navigate(['/inicio'], { replaceUrl: true });
    }
  }

  toggleMenu(): void {
    this.menuStateService.toggle();
  }

  irAIndex(): void {
    this.router.navigateByUrl('/inicio');
  }

  cargarDatosEmpresa(event?: any): void {
    this.loading = true;
    this.cdr.detectChanges();

    this.empresasService.getEmpresas()
      .pipe(
        finalize(() => {
          this.loading = false;
          if (event) event.target.complete();
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (empresas) => {
          if (Array.isArray(empresas) && empresas.length > 0) {
            this.empresa = empresas[0];
            this.nombre = this.empresa.nombre || '';
            this.nit = this.empresa.nit || '';
            this.telefono = this.empresa.telefono || '';
            this.email = this.empresa.email || '';
            this.direccion = this.empresa.direccion || '';
            this.estado = this.empresa.estado || 'Activo';
          }
          this.cdr.detectChanges();
        },
        error: async (err) => {
          console.error('Error al cargar datos de la empresa:', err);
          const toast = await this.toastController.create({
            message: 'No se pudieron cargar los datos de la empresa.',
            duration: 3000,
            color: 'danger',
            position: 'top'
          });
          await toast.present();
          this.cdr.detectChanges();
        }
      });
  }

  async guardarDatos(): Promise<void> {
    if (!this.empresa || !this.empresa.id) return;

    if (!this.nombre.trim() || !this.nit.trim()) {
      const toast = await this.toastController.create({
        message: 'El nombre y el NIT son campos obligatorios.',
        duration: 2500,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    this.guardando = true;
    this.cdr.detectChanges();

    const data: Partial<Empresa> = {
      nombre: this.nombre.trim(),
      nit: this.nit.trim(),
      telefono: this.telefono.trim(),
      email: this.email.trim(),
      direccion: this.direccion.trim()
    };

    this.empresasService.updateEmpresa(this.empresa.id, data)
      .pipe(
        finalize(() => {
          this.guardando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: async (res) => {
          this.empresa = res;
          const toast = await this.toastController.create({
            message: '¡Datos de la empresa actualizados exitosamente!',
            duration: 3000,
            color: 'success',
            position: 'top'
          });
          await toast.present();
          this.cdr.detectChanges();
        },
        error: async (err) => {
          console.error('Error al guardar datos de la empresa:', err);
          const toast = await this.toastController.create({
            message: err?.error?.mensaje || 'Error al actualizar los datos de la empresa.',
            duration: 3500,
            color: 'danger',
            position: 'top'
          });
          await toast.present();
        }
      });
  }

  solicitarCambioEstado(): void {
    this.mostrarModalConfirmacionEstado = true;
    this.cdr.detectChanges();
  }

  cancelarCambioEstado(): void {
    this.mostrarModalConfirmacionEstado = false;
    this.cdr.detectChanges();
  }

  confirmarCambioEstado(): void {
    if (!this.empresa || !this.empresa.id) return;

    const nuevoEstado = this.estado === 'Activo' ? 'Inactivo' : 'Activo';
    this.cambiandoEstado = true;
    this.cdr.detectChanges();

    this.empresasService.updateEmpresa(this.empresa.id, { estado: nuevoEstado })
      .pipe(
        finalize(() => {
          this.cambiandoEstado = false;
          this.mostrarModalConfirmacionEstado = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: async (res) => {
          this.estado = res.estado || nuevoEstado;
          if (this.empresa) this.empresa.estado = this.estado;
          this.cdr.detectChanges();

          const toast = await this.toastController.create({
            message: `Estado operativo actualizado: ${this.estado === 'Activo' ? 'Empresa Activa 🟢' : 'Empresa Pausada 🔴'}`,
            duration: 3500,
            color: this.estado === 'Activo' ? 'success' : 'dark',
            position: 'top'
          });
          await toast.present();
        },
        error: async (err) => {
          console.error('Error al cambiar estado operativo:', err);
          const toast = await this.toastController.create({
            message: 'Error al cambiar el estado operativo de la empresa.',
            duration: 3000,
            color: 'danger',
            position: 'top'
          });
          await toast.present();
        }
      });
  }
}
