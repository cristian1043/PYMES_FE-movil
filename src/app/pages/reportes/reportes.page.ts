import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ReportesService } from '../../services/reportes.service';

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.page.html',
  styleUrls: ['./reportes.page.scss'],
  standalone: false
})
export class ReportesPage implements OnInit {
  loading = false;
  totalVentas = 0;
  totalProductos = 0;
  stockBajoCount = 0;
  usuario: any = null;

  constructor(
    private authService: AuthService,
    private reportesService: ReportesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.usuario = this.authService.getUsuario();
    this.cargarDashboard();
  }

  ionViewWillEnter(): void {
    this.usuario = this.authService.getUsuario();
    this.cargarDashboard();
  }

  cancelarOVolver(): void {
    this.router.navigateByUrl('/inicio');
  }

  cargarDashboard(event?: any): void {
    this.loading = true;
    this.reportesService.getDashboardMetrics().subscribe({
      next: (data: any) => {
        this.loading = false;
        if (event) event.target.complete();
        this.totalVentas = data?.total_ventas || 0;
        this.totalProductos = data?.total_productos || 0;
        this.stockBajoCount = data?.stock_bajo || 0;
      },
      error: (err: any) => {
        this.loading = false;
        if (event) event.target.complete();
        console.error('Error al obtener métricas del dashboard:', err);
      }
    });
  }

  handleRefresh(event: any): void {
    this.cargarDashboard(event);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
