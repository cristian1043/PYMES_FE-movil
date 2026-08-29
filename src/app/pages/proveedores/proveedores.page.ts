import { Component, OnInit } from '@angular/core';
import { ProveedoresService, Proveedor } from '../../services/proveedores.service';

@Component({
  selector: 'app-proveedores',
  templateUrl: './proveedores.page.html',
  styleUrls: ['./proveedores.page.scss'],
  standalone: false
})
export class ProveedoresPage implements OnInit {
  proveedores: Proveedor[] = [];
  loading = true;
  currentPage = 1;
  totalPages = 1;
  hasMorePages = true;

  constructor(private proveedoresService: ProveedoresService) {}

  ngOnInit(): void {
    this.cargarProveedores(1, true);
  }

  ionViewWillEnter(): void {
    this.cargarProveedores(1, true);
  }

  cargarProveedores(page: number = 1, isInitial: boolean = false, event?: any): void {
    if (isInitial) {
      this.loading = true;
      this.currentPage = 1;
      this.proveedores = [];
    }

    this.proveedoresService.getProveedores(page, 15).subscribe({
      next: (res) => {
        this.loading = false;
        if (event) event.target.complete();

        let newItems: Proveedor[] = [];
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
          this.proveedores = newItems;
        } else {
          this.proveedores = [...this.proveedores, ...newItems];
        }
      },
      error: (err) => {
        this.loading = false;
        if (event) event.target.complete();
        console.error('Error al cargar proveedores:', err);
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
    this.cargarProveedores(this.currentPage, false, event);
  }

  handleRefresh(event: any): void {
    this.cargarProveedores(1, true, event);
  }
}
