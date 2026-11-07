import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TerminalesPage } from './terminales.page';

const routes: Routes = [
  {
    path: '',
    component: TerminalesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TerminalesPageRoutingModule {}
