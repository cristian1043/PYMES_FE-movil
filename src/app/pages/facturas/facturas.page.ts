import { Component, OnInit } from '@angular/core';
import { FacturasService, Factura } from '../../services/facturas.service';

@Component({
  selector: 'app-facturas',
  templateUrl: './facturas.page.html',
  styleUrls: ['./facturas.page.scss'],
  standalone: false
})
export class FacturasPage implements OnInit {
  facturas: Factura[] = [];
  loading = true;

  constructor(private facturasService: FacturasService) {}

  ngOnInit(): void {
    this.cargarFacturas();
  }

  ionViewWillEnter(): void {
    this.cargarFacturas();
  }

  cargarFacturas(event?: any): void {
    this.loading = !event;
    this.facturasService.getFacturas().subscribe({
      next: (res) => {
        this.loading = false;
        if (event) event.target.complete();

        if (Array.isArray(res)) {
          this.facturas = res;
        } else if (res && res.items && Array.isArray(res.items)) {
          this.facturas = res.items;
        } else if (res && res.data && Array.isArray(res.data)) {
          this.facturas = res.data;
        } else {
          this.facturas = [];
        }
      },
      error: (err) => {
        this.loading = false;
        if (event) event.target.complete();
        console.error('Error al cargar facturas:', err);
      }
    });
  }

  handleRefresh(event: any): void {
    this.cargarFacturas(event);
  }
}
