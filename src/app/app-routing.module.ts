import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'register',
    loadChildren: () => import('./pages/register/register.module').then(m => m.RegisterPageModule)
  },
  {
    path: 'inicio',
    canActivate: [AuthGuard],
    loadChildren: () => import('./pages/inicio/inicio.module').then(m => m.InicioPageModule)
  },
  {
    path: 'productos',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [1, 2, 3] },
    loadChildren: () => import('./pages/productos/productos.module').then(m => m.ProductosPageModule)
  },
  {
    path: 'facturas',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [1, 2] },
    loadChildren: () => import('./pages/facturas/facturas.module').then(m => m.FacturasPageModule)
  },
  {
    path: 'clientes',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [1, 2] },
    loadChildren: () => import('./pages/clientes/clientes.module').then(m => m.ClientesPageModule)
  },
  {
    path: 'proveedores',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [1, 3] },
    loadChildren: () => import('./pages/proveedores/proveedores.module').then(m => m.ProveedoresPageModule)
  },
  {
    path: 'compras',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [1, 3] },
    loadChildren: () => import('./pages/compras/compras.module').then(m => m.ComprasPageModule)
  },
  {
    path: 'reportes',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [1, 2, 3] },
    loadChildren: () => import('./pages/reportes/reportes.module').then(m => m.ReportesPageModule)
  },
  {
    path: 'usuarios',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [1] },
    loadChildren: () => import('./pages/usuarios/usuarios.module').then(m => m.UsuariosPageModule)
  },
  {
    path: 'folder/:folder',
    canActivate: [AuthGuard],
    loadChildren: () => import('./folder/folder.module').then(m => m.FolderPageModule)
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules, bindToComponentInputs: true })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
