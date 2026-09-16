import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { ToastController } from '@ionic/angular/lazy';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController
  ) {}

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { replaceUrl: true });
      return false;
    }

    const allowedRoles = route.data['roles'] as Array<number>;

    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    const tieneEmpresa = !!this.authService.getEmpresaActiva();
    const u = this.authService.getUsuario();
    const esAdminGlobal = u && (Number(u.id_rol) === 1 || Number(u.rol_id) === 1 || (u.rol || '').toLowerCase().includes('admin'));

    if (!tieneEmpresa && !esAdminGlobal) {
      const toast = await this.toastController.create({
        message: '🏢 Debes seleccionar una empresa activa para acceder a este módulo de gestión.',
        duration: 3500,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      this.router.navigate(['/seleccionar-empresa'], { replaceUrl: true });
      return false;
    }

    if (this.authService.hasRole(allowedRoles)) {
      return true;
    }

    const toast = await this.toastController.create({
      message: '⛔ Acceso Restringido: Tu perfil no tiene permisos para acceder a esta sección.',
      duration: 3500,
      color: 'warning',
      position: 'top'
    });
    await toast.present();

    this.router.navigate([tieneEmpresa ? '/inicio' : '/seleccionar-empresa'], { replaceUrl: true });
    return false;
  }
}
