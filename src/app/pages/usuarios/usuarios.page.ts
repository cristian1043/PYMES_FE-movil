import { Component, OnInit } from '@angular/core';
import { UsuariosService, UsuarioItem } from '../../services/usuarios.service';

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.page.html',
  styleUrls: ['./usuarios.page.scss'],
  standalone: false
})
export class UsuariosPage implements OnInit {
  usuarios: UsuarioItem[] = [];
  loading = true;
  currentPage = 1;
  totalPages = 1;
  hasMorePages = true;

  constructor(private usuariosService: UsuariosService) {}

  ngOnInit(): void {
    this.cargarUsuarios(1, true);
  }

  ionViewWillEnter(): void {
    this.cargarUsuarios(1, true);
  }

  cargarUsuarios(page: number = 1, isInitial: boolean = false, event?: any): void {
    if (isInitial) {
      this.loading = true;
      this.currentPage = 1;
      this.usuarios = [];
    }

    this.usuariosService.getUsuarios(page, 15).subscribe({
      next: (res) => {
        this.loading = false;
        if (event) event.target.complete();

        let newItems: UsuarioItem[] = [];
        if (res && res.items && Array.isArray(res.items)) {
          newItems = res.items;
          this.totalPages = res.total_pages || 1;
          this.hasMorePages = page < this.totalPages;
        } else if (Array.isArray(res)) {
          newItems = res;
          this.hasMorePages = false;
        } else {
          newItems = [];
          this.hasMorePages = false;
        }

        if (isInitial) {
          this.usuarios = newItems;
        } else {
          this.usuarios = [...this.usuarios, ...newItems];
        }
      },
      error: (err) => {
        this.loading = false;
        if (event) event.target.complete();
        console.error('Error al cargar usuarios:', err);
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
    this.cargarUsuarios(this.currentPage, false, event);
  }

  getNombreRol(idRol: number): string {
    if (idRol === 1) return 'Administrador';
    if (idRol === 3) return 'Almacenista';
    return 'Vendedor';
  }

  handleRefresh(event: any): void {
    this.cargarUsuarios(1, true, event);
  }
}
