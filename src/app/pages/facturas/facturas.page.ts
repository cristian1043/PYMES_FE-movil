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
  currentPage = 1;
  totalPages = 1;
  hasMorePages = true;

  constructor(private facturasService: FacturasService) {}

  ngOnInit(): void {
    this.cargarFacturas(1, true);
  }

  ionViewWillEnter(): void {
    this.cargarFacturas(1, true);
  }

  cargarFacturas(page: number = 1, isInitial: boolean = false, event?: any): void {
    if (isInitial) {
      this.loading = true;
      this.currentPage = 1;
      this.facturas = [];
    }

    this.facturasService.getFacturas(page, 15).subscribe({
      next: (res) => {
        this.loading = false;
        if (event) event.target.complete();

        let newItems: Factura[] = [];
        if (Array.isArray(res)) {
          newItems = res;
          this.hasMorePages = false;
        } else if (res && res.items && Array.isArray(res.items)) {
          newItems = res.items;
          this.totalPages = res.total_pages || 1;
          this.hasMorePages = page < this.totalPages;
        } else {
          newItems = [];
          this.hasMorePages = false;
        }

        if (isInitial) {
          this.facturas = newItems;
        } else {
          this.facturas = [...this.facturas, ...newItems];
        }
      },
      error: (err) => {
        this.loading = false;
        if (event) event.target.complete();
        console.error('Error al cargar facturas:', err);
      }
    });
  }

  loadMoreData(event: any): void {
    if (!this.hasMorePages) {
      event.target.disabled = true;
      event.target.complete();
      return;
    }
    this.currentPage++;
    this.cargarFacturas(this.currentPage, false, event);
  }

  handleRefresh(event: any): void {
    this.cargarFacturas(1, true, event);
  }
}
