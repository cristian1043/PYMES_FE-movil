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

    this.router.navigate(['/inicio'], { replaceUrl: true });
    return false;
  }
}
