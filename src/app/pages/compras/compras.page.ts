import { Component, OnInit } from '@angular/core';
import { ComprasService, Compra } from '../../services/compras.service';

@Component({
  selector: 'app-compras',
  templateUrl: './compras.page.html',
  styleUrls: ['./compras.page.scss'],
  standalone: false
})
export class ComprasPage implements OnInit {
  compras: Compra[] = [];
  loading = true;
  currentPage = 1;
  totalPages = 1;
  hasMorePages = true;

  constructor(private comprasService: ComprasService) {}

  ngOnInit(): void {
    this.cargarCompras(1, true);
  }

  ionViewWillEnter(): void {
    this.cargarCompras(1, true);
  }

  cargarCompras(page: number = 1, isInitial: boolean = false, event?: any): void {
    if (isInitial) {
      this.loading = true;
      this.currentPage = 1;
      this.compras = [];
    }

    this.comprasService.getCompras(page, 15).subscribe({
      next: (res) => {
        this.loading = false;
        if (event) event.target.complete();

        let newItems: Compra[] = [];
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
          this.compras = newItems;
        } else {
          this.compras = [...this.compras, ...newItems];
        }
      },
      error: (err) => {
        this.loading = false;
        if (event) event.target.complete();
        console.error('Error al cargar compras:', err);
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
    this.cargarCompras(this.currentPage, false, event);
  }

  handleRefresh(event: any): void {
    this.cargarCompras(1, true, event);
  }
}
