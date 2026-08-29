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

  constructor(private comprasService: ComprasService) {}

  ngOnInit(): void {
    this.cargarCompras();
  }

  ionViewWillEnter(): void {
    this.cargarCompras();
  }

  cargarCompras(event?: any): void {
    this.loading = !event;
    this.comprasService.getCompras().subscribe({
      next: (data) => {
        this.loading = false;
        this.compras = Array.isArray(data) ? data : [];
        if (event) event.target.complete();
      },
      error: (err) => {
        this.loading = false;
        if (event) event.target.complete();
        console.error('Error al cargar compras:', err);
      }
    });
  }

  handleRefresh(event: any): void {
    this.cargarCompras(event);
  }
}
