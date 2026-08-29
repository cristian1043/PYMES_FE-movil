import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ComprasPage } from './compras.page';

const routes: Routes = [
  {
    path: '',
    component: ComprasPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ComprasPageRoutingModule {}
