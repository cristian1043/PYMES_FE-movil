import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

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
    path: 'productos',
    canActivate: [AuthGuard],
    loadChildren: () => import('./pages/productos/productos.module').then(m => m.ProductosPageModule)
  },
  {
    path: 'facturas',
    canActivate: [AuthGuard],
    loadChildren: () => import('./pages/facturas/facturas.module').then(m => m.FacturasPageModule)
  },
  {
    path: 'clientes',
    canActivate: [AuthGuard],
    loadChildren: () => import('./pages/clientes/clientes.module').then(m => m.ClientesPageModule)
  },
  {
    path: 'reportes',
    canActivate: [AuthGuard],
    loadChildren: () => import('./pages/reportes/reportes.module').then(m => m.ReportesPageModule)
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
