import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastController } from '@ionic/angular/lazy';
import { AuthService } from '../../services/auth.service';
import { ProveedoresService, Proveedor } from '../../services/proveedores.service';
import { MenuStateService } from '../../services/menu-state.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-proveedores',
  templateUrl: './proveedores.page.html',
  styleUrls: ['./proveedores.page.scss'],
  standalone: false
})
export class ProveedoresPage implements OnInit, OnDestroy {
  activeTab: 'hub' | 'nuevo' | 'listado' = 'hub';

  proveedores: Proveedor[] = [];
  loading = false;
  usuario: any = null;
  currentPage = 1;
  totalPages = 1;
  hasMorePages = true;

  proveedorDestacadoId: number | null = null;
  productoReabastecerId: number | null = null;
  productoReabastecerNombre: string = '';
  empresaActiva: any = null;
  esAdmin = false;

  // Formulario nuevo proveedor
  siguienteCodigo = 'PROV-E1-001';
  cargandoCodigo = false;
  nombreProveedor = '';
  nitProveedor = '';
  contactoProveedor = '';
  telefonoProveedor = '';
  emailProveedor = '';
  guardando = false;

  // Modal de edición para administrador
  mostrarModalEditar = false;
  proveedorEditando: Proveedor | null = null;
  editNombre = '';
  editNit = '';
  editContacto = '';
  editTelefono = '';
  editEmail = '';
  editDireccion = '';
  guardandoEdicion = false;

  // Modal de confirmación personalizado
  mostrarModalConfirmacion = false;
  modalTitulo = '';
  modalMensaje = '';

  private queryParamsSub?: Subscription;

  constructor(
    private authService: AuthService,
    private proveedoresService: ProveedoresService,
    private router: Router,
    private route: ActivatedRoute,
    private menuStateService: MenuStateService,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.verificarAutenticacion();
    this.queryParamsSub = this.route.queryParamMap.subscribe((params) => {
      const tabParam = params.get('tab');
      const provIdParam = params.get('proveedor_id');
      const prodIdParam = params.get('producto_id');
      const prodNombreParam = params.get('producto_nombre');

      this.proveedorDestacadoId = provIdParam ? Number(provIdParam) : null;
      this.productoReabastecerId = prodIdParam ? Number(prodIdParam) : null;
      this.productoReabastecerNombre = prodNombreParam || '';

      const newTab = (tabParam === 'listado' || tabParam === 'nuevo') ? tabParam : 'hub';
      const tabChanged = this.activeTab !== newTab;
      this.activeTab = newTab;

      if (this.activeTab === 'listado') {
        if (tabChanged || this.proveedores.length === 0) {
          this.cargarProveedores(1, true);
        }
      } else if (this.activeTab === 'nuevo') {
        this.cargarSiguienteCodigo();
      }
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    if (this.queryParamsSub) {
      this.queryParamsSub.unsubscribe();
    }
  }

  ionViewWillEnter(): void {
    this.verificarAutenticacion();
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    const targetTab = (tabParam === 'listado' || tabParam === 'nuevo') ? tabParam : 'hub';
    this.activeTab = targetTab;
    if (this.activeTab === 'listado') {
      this.cargarProveedores(1, true);
    } else if (this.activeTab === 'nuevo') {
      this.cargarSiguienteCodigo();
    }
    this.cdr.detectChanges();
  }

  private verificarAutenticacion(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }
    this.usuario = this.authService.getUsuario();
    this.empresaActiva = this.authService.getEmpresaActiva();
    this.esAdmin = this.authService.hasRole([1]) ||
      (this.usuario?.rol === 'Administrador') ||
      (Number(this.usuario?.id_rol) === 1);
    this.cdr.detectChanges();
  }

  irAComprarConProveedor(prov: Proveedor): void {
    this.router.navigate(['/compras'], {
      queryParams: {
        tab: 'nueva',
        proveedor_id: prov.id,
        producto_id: this.productoReabastecerId || '',
        producto_nombre: this.productoReabastecerNombre || ''
      }
    });
  }

  toggleMenu(): void {
    this.menuStateService.toggle();
  }

  irAIndex(): void {
    this.router.navigateByUrl('/inicio');
  }

  cancelarOVolver(): void {
    if (this.activeTab === 'hub') {
      this.router.navigateByUrl('/inicio');
    } else {
      this.activeTab = 'hub';
      this.router.navigate([], { relativeTo: this.route, queryParams: {} });
      this.cdr.detectChanges();
    }
  }

  cargarSiguienteCodigo(): void {
    const emp = this.authService.getEmpresaActiva();
    this.cargandoCodigo = true;
    this.cdr.detectChanges();
    this.proveedoresService.getSiguienteCodigo(emp?.id).subscribe({
      next: (res) => {
        this.cargandoCodigo = false;
        if (res && res.siguiente_codigo) {
          this.siguienteCodigo = res.siguiente_codigo;
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoCodigo = false;
        const eid = emp?.id || 1;
        this.siguienteCodigo = `PROV-E${eid}-${(this.proveedores.length + 1).toString().padStart(3, '0')}`;
        this.cdr.detectChanges();
      }
    });
  }

  seleccionarAccion(accion: 'nuevo' | 'listado'): void {
    this.activeTab = accion;
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab: accion } });
    if (accion === 'nuevo') {
      this.cargarSiguienteCodigo();
    } else if (accion === 'listado') {
      this.cargarProveedores(1, true);
    }
    this.cdr.detectChanges();
  }

  cargarProveedores(page: number = 1, isInitial: boolean = false, event?: any): void {
    if (isInitial) {
      this.loading = true;
      this.currentPage = page;
      this.proveedores = [];
      this.cdr.detectChanges();
    }


    this.proveedoresService.getProveedores(page, 10).subscribe({
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
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        if (event) event.target.complete();
        console.error('Error al cargar proveedores:', err);
        this.cdr.detectChanges();
      }
    });
  }

  cambiarPagina(delta: number): void {
    const targetPage = this.currentPage + delta;
    if (targetPage >= 1 && targetPage <= this.totalPages) {
      this.cargarProveedores(targetPage, true);
    }
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

  async onRegistrarProveedor(): Promise<void> {
    if (!this.nombreProveedor) {
      const toast = await this.toastController.create({
        message: 'Por favor ingresa el nombre de la empresa o proveedor.',
        duration: 2500,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    this.guardando = true;

    this.proveedoresService.createProveedor({
      codigo: this.siguienteCodigo,
      nombre: this.nombreProveedor.trim(),
      nit_documento: (this.nitProveedor || '').trim(),
      contacto: (this.contactoProveedor || '').trim(),
      telefono: (this.telefonoProveedor || '').trim(),
      email: (this.emailProveedor || '').trim()
    }).subscribe({
      next: (res) => {
        this.guardando = false;
        this.limpiarFormulario();
        this.modalTitulo = '¡Proveedor Registrado!';
        this.modalMensaje = 'El proveedor ha sido registrado con éxito. ¿Quieres ver el directorio de proveedores?';
        this.mostrarModalConfirmacion = true;
        this.cdr.detectChanges();
      },
      error: async (err) => {
        this.guardando = false;
        console.error('Error al registrar proveedor:', err);
        const toast = await this.toastController.create({
          message: err?.error?.mensaje || 'No se pudo registrar el proveedor. Intenta nuevamente.',
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
        this.cdr.detectChanges();
      }
    });
  }

  responderModal(verListado: boolean): void {
    this.mostrarModalConfirmacion = false;
    this.limpiarFormulario();
    if (verListado) {
      this.seleccionarAccion('listado');
    } else {
      this.activeTab = 'nuevo';
    }
    this.cdr.detectChanges();
  }

  abrirModalEditar(prov: Proveedor): void {
    if (!this.esAdmin) return;
    this.proveedorEditando = prov;
    this.editNombre = prov.nombre || '';
    this.editNit = prov.nit_documento || prov.nit || '';
    this.editContacto = prov.contacto || '';
    this.editTelefono = prov.telefono || '';
    this.editEmail = prov.email || '';
    this.editDireccion = prov.direccion || '';
    this.mostrarModalEditar = true;
    this.cdr.detectChanges();
  }

  cerrarModalEditar(): void {
    this.mostrarModalEditar = false;
    this.proveedorEditando = null;
    this.cdr.detectChanges();
  }

  async onGuardarEdicionProveedor(): Promise<void> {
    if (!this.proveedorEditando) return;
    if (!this.editNombre.trim()) {
      const toast = await this.toastController.create({
        message: 'Por favor ingresa el nombre de la empresa o proveedor.',
        duration: 2500,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    this.guardandoEdicion = true;
    this.proveedoresService.updateProveedor(this.proveedorEditando.id, {
      nombre: this.editNombre.trim(),
      nit_documento: this.editNit.trim(),
      contacto: this.editContacto.trim(),
      telefono: this.editTelefono.trim(),
      email: this.editEmail.trim(),
      direccion: this.editDireccion.trim()
    }).subscribe({
      next: async (res) => {
        this.guardandoEdicion = false;
        this.cerrarModalEditar();
        const toast = await this.toastController.create({
          message: 'Proveedor actualizado correctamente.',
          duration: 2500,
          color: 'success',
          position: 'top'
        });
        await toast.present();
        this.cargarProveedores(this.currentPage, true);
      },
      error: async (err) => {
        this.guardandoEdicion = false;
        console.error('Error al actualizar proveedor:', err);
        const toast = await this.toastController.create({
          message: err?.error?.mensaje || 'No se pudo actualizar el proveedor.',
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
        this.cdr.detectChanges();
      }
    });
  }

  private limpiarFormulario(): void {
    this.nombreProveedor = '';
    this.nitProveedor = '';
    this.contactoProveedor = '';
    this.telefonoProveedor = '';
    this.emailProveedor = '';
    this.cargarSiguienteCodigo();
  }
}
