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

  constructor(private usuariosService: UsuariosService) {}

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  ionViewWillEnter(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(event?: any): void {
    this.loading = !event;
    this.usuariosService.getUsuarios().subscribe({
      next: (res) => {
        this.loading = false;
        if (res && res.items && Array.isArray(res.items)) {
          this.usuarios = res.items;
        } else if (Array.isArray(res)) {
          this.usuarios = res;
        } else {
          this.usuarios = [];
        }
        if (event) event.target.complete();
      },
      error: (err) => {
        this.loading = false;
        if (event) event.target.complete();
        console.error('Error al cargar usuarios:', err);
      }
    });
  }

  getNombreRol(idRol: number): string {
    if (idRol === 1) return 'Administrador';
    if (idRol === 3) return 'Almacenista';
    return 'Vendedor';
  }

  handleRefresh(event: any): void {
    this.cargarUsuarios(event);
  }
}
