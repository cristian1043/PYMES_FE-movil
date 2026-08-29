import { Component, OnInit } from '@angular/core';
import { ClientesService, Cliente } from '../../services/clientes.service';

@Component({
  selector: 'app-clientes',
  templateUrl: './clientes.page.html',
  styleUrls: ['./clientes.page.scss'],
  standalone: false
})
export class ClientesPage implements OnInit {
  clientes: Cliente[] = [];
  loading = true;
  currentPage = 1;
  totalPages = 1;
  hasMorePages = true;

  constructor(private clientesService: ClientesService) {}

  ngOnInit(): void {
    this.cargarClientes(1, true);
  }

  ionViewWillEnter(): void {
    this.cargarClientes(1, true);
  }

  cargarClientes(page: number = 1, isInitial: boolean = false, event?: any): void {
    if (isInitial) {
      this.loading = true;
      this.currentPage = 1;
      this.clientes = [];
    }

    this.clientesService.getClientes(page, 15).subscribe({
      next: (res) => {
        this.loading = false;
        if (event) event.target.complete();

        let newItems: Cliente[] = [];
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
          this.clientes = newItems;
        } else {
          this.clientes = [...this.clientes, ...newItems];
        }
      },
      error: (err) => {
        this.loading = false;
        if (event) event.target.complete();
        console.error('Error al cargar clientes:', err);
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
    this.cargarClientes(this.currentPage, false, event);
  }

  handleRefresh(event: any): void {
    this.cargarClientes(1, true, event);
  }
}
