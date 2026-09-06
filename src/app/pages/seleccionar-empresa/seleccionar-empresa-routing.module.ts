import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SeleccionarEmpresaPage } from './seleccionar-empresa.page';

const routes: Routes = [
  {
    path: '',
    component: SeleccionarEmpresaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SeleccionarEmpresaPageRoutingModule {}
