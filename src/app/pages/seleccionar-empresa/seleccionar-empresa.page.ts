import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular/lazy';
import { AuthService } from '../../services/auth.service';
import { EmpresasService, Empresa } from '../../services/empresas.service';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

export interface EmpresaConRol extends Empresa {
  rol_id: number;
  rol_nombre: string;
  vinculacion_estado: string;
  esActivaActual?: boolean;
}

@Component({
  selector: 'app-seleccionar-empresa',
  templateUrl: './seleccionar-empresa.page.html',
  styleUrls: ['./seleccionar-empresa.page.scss'],
  standalone: false
})
export class SeleccionarEmpresaPage implements OnInit {
  usuario: any = null;
  rolIdGlobal: number = 2;
  empresas: EmpresaConRol[] = [];
  loading = false;
  guardandoEmpresa = false;

  // Modal para nueva empresa (Admin Global)
  mostrarModalNuevaEmpresa = false;
  nuevoNombre = '';
  nuevoNit = '';
  nuevoTelefono = '';
  nuevoEmail = '';
  nuevaDireccion = '';

  constructor(
    private authService: AuthService,
    private empresasService: EmpresasService,
    private router: Router,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.verificarAutenticacion();
  }

  ionViewWillEnter(): void {
    this.verificarAutenticacion();
    this.cargarEmpresas();
  }

  private verificarAutenticacion(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }
    this.usuario = this.authService.getUsuario();
    this.rolIdGlobal = Number(this.usuario?.id_rol || this.usuario?.rol_id || 2);
  }

  cargarEmpresas(event?: any): void {
    if (!this.usuario) {
      this.verificarAutenticacion();
    }
    if (!this.usuario) return;

    this.loading = true;
    this.cdr.detectChanges();

    const usuarioId = Number(this.usuario.id);
    const empresaActivaStorage = this.authService.getEmpresaActiva();

    this.empresasService.getEmpresas()
      .pipe(
        finalize(() => {
          this.loading = false;
          if (event) event.target.complete();
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (empresasData) => {
          if (!Array.isArray(empresasData) || empresasData.length === 0) {
            this.empresas = [];
            this.cdr.detectChanges();
            return;
          }

          // Consultar la vinculación de cada empresa para este usuario
          const vinculacionesObservables = empresasData.map((emp) =>
            this.empresasService.getVinculacion(usuarioId, Number(emp.id)).pipe(
              catchError(() => of({ estado: 'Activo', rol_id: this.rolIdGlobal }))
            )
          );

          forkJoin(vinculacionesObservables).subscribe({
            next: (vinculaciones) => {
              const empresasVisibles: EmpresaConRol[] = [];
              const rolesNombres: Record<number, string> = {
                1: 'Administrador',
                2: 'Vendedor',
                3: 'Almacenista'
              };

              empresasData.forEach((emp, index) => {
                const vinc = vinculaciones[index] || {};
                const estadoVinc = vinc.estado || (this.rolIdGlobal === 1 ? 'Activo' : 'No Vinculado');
                const rolVinc = Number(vinc.rol_id || this.rolIdGlobal);

                // Admin global ve todas las empresas. Vendedores y almacenistas solo las activas
                if (this.rolIdGlobal === 1 || estadoVinc === 'Activo') {
                  const esActivaActual = empresaActivaStorage && Number(empresaActivaStorage.id) === Number(emp.id);

                  empresasVisibles.push({
                    ...emp,
                    rol_id: rolVinc,
                    rol_nombre: rolesNombres[rolVinc] || 'Vendedor',
                    vinculacion_estado: estadoVinc,
                    esActivaActual: !!esActivaActual
                  });
                }
              });

              this.empresas = empresasVisibles;
              this.cdr.detectChanges();
            },
            error: (err) => {
              console.error('Error al resolver vinculaciones:', err);
              this.empresas = [];
              this.cdr.detectChanges();
            }
          });
        },
        error: async (err) => {
          console.error('Error al cargar empresas:', err);
          this.empresas = [];
          const toast = await this.toastController.create({
            message: 'No se pudieron cargar las empresas disponibles.',
            duration: 3000,
            color: 'danger',
            position: 'top'
          });
          await toast.present();
          this.cdr.detectChanges();
        }
      });
  }

  async seleccionarEmpresa(emp: EmpresaConRol): Promise<void> {
    // 1. Bloqueo si las operaciones de la empresa están pausadas y el usuario no es Admin Global
    if (this.rolIdGlobal !== 1 && emp.estado === 'Inactivo') {
      const toast = await this.toastController.create({
        message: '⛔ Acceso Denegado: Las operaciones de esta empresa han sido pausadas por el Administrador.',
        duration: 4000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
      return;
    }

    // 2. Bloqueo si la vinculación del trabajador ha sido desactivada
    if (this.rolIdGlobal !== 1 && emp.vinculacion_estado === 'Desvinculado') {
      const toast = await this.toastController.create({
        message: '⛔ Acceso Denegado: Tu vinculación en esta empresa ha sido desactivada.',
        duration: 4000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    // 3. Activar empresa en sesión
    this.authService.setEmpresaActiva(emp, emp.rol_id);

    const toast = await this.toastController.create({
      message: `🏢 Espacio de trabajo activo: ${emp.nombre}`,
      duration: 2500,
      color: 'success',
      position: 'top'
    });
    await toast.present();

    this.router.navigateByUrl('/inicio');
  }

  abrirModalNuevaEmpresa(): void {
    this.nuevoNombre = '';
    this.nuevoNit = '';
    this.nuevoTelefono = '';
    this.nuevoEmail = '';
    this.nuevaDireccion = '';
    this.mostrarModalNuevaEmpresa = true;
    this.cdr.detectChanges();
  }

  cerrarModalNuevaEmpresa(): void {
    this.mostrarModalNuevaEmpresa = false;
    this.cdr.detectChanges();
  }

  guardarNuevaEmpresa(): void {
    if (this.guardandoEmpresa) return;

    const nombreTrim = this.nuevoNombre.trim();
    const nitTrim = this.nuevoNit.trim();

    if (!nombreTrim || !nitTrim) {
      this.mostrarToast('Por favor completa el Nombre y el NIT de la empresa.', 'warning');
      return;
    }

    this.guardandoEmpresa = true;
    this.cdr.detectChanges();

    const payload: Empresa = {
      nombre: nombreTrim,
      nit: nitTrim,
      telefono: this.nuevoTelefono.trim(),
      email: this.nuevoEmail.trim(),
      direccion: this.nuevaDireccion.trim(),
      estado: 'Activo'
    };

    this.empresasService.createEmpresa(payload)
      .pipe(
        finalize(() => {
          this.guardandoEmpresa = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: async (res) => {
          await this.mostrarToast('¡Empresa registrada exitosamente!', 'success');
          this.cerrarModalNuevaEmpresa();
          this.cargarEmpresas();
        },
        error: async (err) => {
          console.error('Error al registrar empresa:', err);
          const msg = err?.error?.mensaje || 'Error al registrar la empresa en el sistema.';
          await this.mostrarToast(msg, 'danger');
        }
      });
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }

  private async mostrarToast(mensaje: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      color: color,
      position: 'top'
    });
    await toast.present();
  }
}
