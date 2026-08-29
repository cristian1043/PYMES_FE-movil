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

  constructor(private clientesService: ClientesService) {}

  ngOnInit(): void {
    this.cargarClientes();
  }

  ionViewWillEnter(): void {
    this.cargarClientes();
  }

  cargarClientes(event?: any): void {
    this.loading = !event;
    this.clientesService.getClientes().subscribe({
      next: (res) => {
        this.loading = false;
        if (event) event.target.complete();

        if (Array.isArray(res)) {
          this.clientes = res;
        } else if (res && res.items && Array.isArray(res.items)) {
          this.clientes = res.items;
        } else if (res && res.data && Array.isArray(res.data)) {
          this.clientes = res.data;
        } else {
          this.clientes = [];
        }
      },
      error: (err) => {
        this.loading = false;
        if (event) event.target.complete();
        console.error('Error al cargar clientes:', err);
      }
    });
  }

  handleRefresh(event: any): void {
    this.cargarClientes(event);
  }
}
