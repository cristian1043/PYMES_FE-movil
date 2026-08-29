import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  usuario: any = null;

  protected readonly menuCategorias = [
    {
      titulo: 'Gestión Principal',
      items: [
        { title: 'Productos e Inventario', url: '/productos', icon: 'cube' },
        { title: 'Facturas y Ventas', url: '/facturas', icon: 'document-text' },
      ]
    },
    {
      titulo: 'Directorio',
      items: [
        { title: 'Clientes', url: '/clientes', icon: 'people' },
      ]
    },
    {
      titulo: 'Analítica',
      items: [
        { title: 'Reportes y Métricas', url: '/reportes', icon: 'bar-chart' },
      ]
    }
  ];

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.usuario = user;
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
