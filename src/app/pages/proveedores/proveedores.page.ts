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

  constructor(private proveedoresService: ProveedoresService) {}

  ngOnInit(): void {
    this.cargarProveedores();
  }

  ionViewWillEnter(): void {
    this.cargarProveedores();
  }

  cargarProveedores(event?: any): void {
    this.loading = !event;
    this.proveedoresService.getProveedores().subscribe({
      next: (data) => {
        this.loading = false;
        this.proveedores = Array.isArray(data) ? data : [];
        if (event) event.target.complete();
      },
      error: (err) => {
        this.loading = false;
        if (event) event.target.complete();
        console.error('Error al cargar proveedores:', err);
      }
    });
  }

  handleRefresh(event: any): void {
    this.cargarProveedores(event);
  }
}
