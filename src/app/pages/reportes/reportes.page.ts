import { Component, OnInit } from '@angular/core';
import { ReportesService } from '../../services/reportes.service';

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.page.html',
  styleUrls: ['./reportes.page.scss'],
  standalone: false
})
export class ReportesPage implements OnInit {
  loading = true;
  totalVentas = 0;
  totalProductos = 0;
  stockBajoCount = 0;

  constructor(private reportesService: ReportesService) {}

  ngOnInit(): void {
    this.cargarReportes();
  }

  ionViewWillEnter(): void {
    this.cargarReportes();
  }

  cargarReportes(event?: any): void {
    this.loading = !event;

    this.reportesService.getReporteInventario().subscribe({
      next: (res) => {
        this.loading = false;
        if (event) event.target.complete();

        if (res) {
          this.totalProductos = res.total_productos || res.length || 0;
          this.stockBajoCount = res.stock_bajo_count || 0;
        }
      },
      error: (err) => {
        this.loading = false;
        if (event) event.target.complete();
        console.error('Error al cargar reporte de inventario:', err);
      }
    });

    this.reportesService.getReporteVentas().subscribe({
      next: (res) => {
        if (res && res.total_ventas) {
          this.totalVentas = res.total_ventas;
        }
      },
      error: (err) => {
        console.error('Error al cargar reporte de ventas:', err);
      }
    });
  }

  handleRefresh(event: any): void {
    this.cargarReportes(event);
  }
}
